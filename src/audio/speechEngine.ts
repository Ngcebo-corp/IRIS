import { LipSyncData } from "../types";

export class SpeechEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;
  private isListening = false;
  private femaleVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private micStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private simulatedFormantOsc: OscillatorNode | null = null;
  private simulatedFormantGain: GainNode | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;

  public onLipSyncUpdate?: (data: LipSyncData) => void;
  public onSpeechStart?: () => void;
  public onSpeechEnd?: () => void;
  public onTranscript?: (text: string, isFinal: boolean) => void;
  public onMicVolume?: (volume: number) => void;

  constructor() {
    if (typeof window !== "undefined") {
      this.synth = window.speechSynthesis || null;
      this.initVoices();
      this.initRecognition();
    }
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private initVoices() {
    if (!this.synth) return;
    const load = () => {
      const voices = this.synth?.getVoices() || [];
      // Look for high-quality female English voices
      const preferredNames = [
        "Google UK English Female",
        "Google US English",
        "Samantha",
        "Karen",
        "Victoria",
        "Zira",
        "Siri",
        "Moira",
        "Fiona",
      ];
      let selected: SpeechSynthesisVoice | null = null;

      for (const name of preferredNames) {
        const found = voices.find(
          (v) => v.name.includes(name) && v.lang.startsWith("en")
        );
        if (found) {
          selected = found;
          break;
        }
      }

      if (!selected) {
        selected =
          voices.find(
            (v) =>
              (v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("woman")) &&
              v.lang.startsWith("en")
          ) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0] ||
          null;
      }

      this.femaleVoice = selected;
      this.voicesLoaded = true;
    };

    load();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  private initRecognition() {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.onTranscript?.(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          this.onTranscript?.(interimTranscript.trim(), false);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.onerror = (e: any) => {
        console.warn("Speech recognition notice:", e.error);
        this.isListening = false;
      };
    }
  }

  public async startListening(): Promise<boolean> {
    this.stopSpeaking();
    const ctx = this.ensureAudioContext();

    try {
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const source = ctx.createMediaStreamSource(this.micStream);
        this.micAnalyser = ctx.createAnalyser();
        this.micAnalyser.fftSize = 128;
        source.connect(this.micAnalyser);
      }
    } catch (err) {
      console.warn("Microphone stream not accessible:", err);
    }

    if (this.recognition) {
      try {
        this.isListening = true;
        this.recognition.start();
        return true;
      } catch (err) {
        console.warn("Recognition already active or error:", err);
        return true;
      }
    }
    return false;
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  public getMicVolume(): number {
    if (!this.micAnalyser) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length / 255;
    return Math.min(1, avg * 2.5);
  }

  /**
   * Speaks text using speech synthesis + synchronized Web Audio formant modulator
   * to drive realistic lip sync and frequency analysis.
   */
  public speak(
    text: string,
    onEndCallback?: () => void,
    options?: { pitch?: number; rate?: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      this.stopSpeaking();
      const ctx = this.ensureAudioContext();

      if (!this.synth) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.femaleVoice) {
        utterance.voice = this.femaleVoice;
      }
      utterance.pitch = options?.pitch ?? 1.08; // Dynamic doll pitch
      utterance.rate = options?.rate ?? 1.02; // Dynamic doll rate

      // Create an inaudible carrier through the analyser to get continuous FFT data
      // synced to speech boundaries
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime); // Inaudible or ultra-subtle
      osc.connect(gain);
      if (this.analyser) {
        gain.connect(this.analyser);
      }

      this.simulatedFormantOsc = osc;
      this.simulatedFormantGain = gain;
      osc.start();

      let wordInterval: any = null;
      const words = text.split(/\s+/);
      let wordIdx = 0;

      utterance.onstart = () => {
        this.onSpeechStart?.();

        // Modulate the analyzer energy with speech envelope
        const avgWordDurationMs = Math.max(120, (text.length / words.length) * 55);
        wordInterval = setInterval(() => {
          if (wordIdx < words.length) {
            const currentWord = words[wordIdx].toLowerCase();
            wordIdx++;

            // Detect dominant vowel sound in current word for realistic lip posture
            let targetVowel: LipSyncData["vowel"] = "A";
            if (/[ou]/.test(currentWord)) targetVowel = "O";
            else if (/[eiy]/.test(currentWord)) targetVowel = "E";
            else if (/[mbp]/.test(currentWord)) targetVowel = "M";
            else targetVowel = "A";

            // Inject harmonic pulse into analyser
            if (gain && ctx) {
              const now = ctx.currentTime;
              gain.gain.cancelScheduledValues(now);
              gain.gain.setValueAtTime(0.35, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + (avgWordDurationMs / 1000) * 0.85);
            }
          }
        }, avgWordDurationMs);
      };

      utterance.onend = () => {
        if (wordInterval) clearInterval(wordInterval);
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
        this.currentUtterance = null;
        this.onSpeechEnd?.();
        onEndCallback?.();
        resolve();
      };

      utterance.onerror = (e) => {
        if (wordInterval) clearInterval(wordInterval);
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
        this.currentUtterance = null;
        this.onSpeechEnd?.();
        onEndCallback?.();
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
      } catch {}
      this.activeSourceNode = null;
    }
    if (this.simulatedFormantOsc) {
      try {
        this.simulatedFormantOsc.stop();
      } catch {}
      this.simulatedFormantOsc = null;
    }
    this.currentUtterance = null;
  }

  /**
   * Reads the current real-time frequency spectrum and returns computed LipSyncData
   */
  public getLipSyncFrame(isSpeaking: boolean): LipSyncData {
    if (!isSpeaking || !this.analyser) {
      return {
        volume: 0,
        open: 0,
        width: 0.5,
        pucker: 0,
        vowel: "rest",
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(freqData);

    let sum = 0;
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;

    const lowEnd = Math.floor(bufferLength * 0.2);
    const midEnd = Math.floor(bufferLength * 0.6);

    for (let i = 0; i < bufferLength; i++) {
      const val = freqData[i];
      sum += val;
      if (i < lowEnd) lowSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const avg = sum / bufferLength / 255;
    const lowAvg = lowSum / (lowEnd || 1) / 255;
    const midAvg = midSum / ((midEnd - lowEnd) || 1) / 255;
    const highAvg = highSum / ((bufferLength - midEnd) || 1) / 255;

    // Map frequency distribution to mouth shape
    // Low frequency energy (vowel core like 'Ah', 'Oh') -> jaw opens
    // Mid energy -> wide mouth ('Ee', 'Ay')
    // High energy -> lips pucker / teeth close
    const volume = Math.min(1, avg * 3.2);
    const open = Math.min(1, Math.max(0, lowAvg * 3.4 + avg * 0.5));
    const width = Math.min(1, Math.max(0.2, 0.4 + midAvg * 1.2 - lowAvg * 0.3));
    const pucker = Math.min(1, Math.max(0, (highAvg * 1.5 - midAvg * 0.5)));

    let vowel: LipSyncData["vowel"] = "rest";
    if (volume < 0.05) vowel = "rest";
    else if (pucker > 0.4) vowel = "O";
    else if (width > 0.6) vowel = "E";
    else if (open > 0.4) vowel = "A";
    else vowel = "M";

    return {
      volume,
      open,
      width,
      pucker,
      vowel,
    };
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || [];
  }

  public setVoice(voice: SpeechSynthesisVoice) {
    this.femaleVoice = voice;
  }

  public getCurrentVoice(): SpeechSynthesisVoice | null {
    return this.femaleVoice;
  }
}

// Export singleton helper
export const speechEngine = new SpeechEngine();
