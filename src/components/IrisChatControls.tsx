import React, { useState, useRef } from "react";
import { IrisState, IrisExpression, RobotDollName } from "../types";
import { DOLL_PROFILES } from "../data/dollProfiles";

interface IrisChatControlsProps {
  doll: RobotDollName;
  state: IrisState;
  expression: IrisExpression;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onSendMessage: (message: string) => void;
  latestTranscript: string;
  latestIrisReply: string;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const IrisChatControls: React.FC<IrisChatControlsProps> = ({
  doll,
  state,
  expression,
  isListening,
  onStartListening,
  onStopListening,
  onSendMessage,
  latestTranscript,
  latestIrisReply,
  isMuted,
  onToggleMute,
}) => {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const profile = DOLL_PROFILES[doll];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || state === "thinking") return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div
      id="iris-chat-controls"
      className="absolute bottom-4 sm:bottom-6 inset-x-0 mx-auto w-full max-w-2xl px-4 z-20 flex flex-col items-center gap-2.5 pointer-events-auto"
    >
      {/* Subtitle / Dialogue Bubble */}
      {(latestTranscript || latestIrisReply || state === "thinking") && (
        <div className="w-full max-w-lg px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 backdrop-blur-xl shadow-2xl text-center transition-all animate-fadeIn">
          {state === "thinking" ? (
            <div className="flex items-center justify-center gap-2 text-amber-300 font-mono text-xs">
              <span className="animate-spin text-sm">💭</span>
              <span>{profile.name} is synthesizing neural thought vectors...</span>
            </div>
          ) : isListening && latestTranscript ? (
            <div className="text-emerald-400 font-mono text-xs flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>&ldquo;{latestTranscript}&rdquo;</span>
            </div>
          ) : latestIrisReply ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-cyan-400/90 uppercase">
                <span>✨</span>
                <span>
                  {profile.name} Voice Synthesizer [{expression}]
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed">
                {latestIrisReply}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Suggested Quick Diagnostic Prompts for Active Doll */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-full py-1 scrollbar-none">
        {profile.samplePrompts.slice(0, 3).map((prompt, idx) => (
          <button
            key={idx}
            id={`iris-quick-prompt-${idx}`}
            onClick={() => onSendMessage(prompt)}
            disabled={state === "thinking" || state === "speaking"}
            className="text-[11px] font-mono whitespace-nowrap px-3 py-1 rounded-full bg-slate-900/85 border border-slate-700/70 hover:border-pink-400/60 hover:text-pink-300 text-slate-300 transition-all backdrop-blur-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Interactive Control Bar */}
      <div className="w-full flex items-center gap-2 bg-slate-950/92 border border-slate-800/90 focus-within:border-cyan-500/60 p-1.5 sm:p-2 rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/80 transition-all">
        {/* Microphone Toggle Button */}
        <button
          id="iris-mic-button"
          type="button"
          onClick={isListening ? onStopListening : onStartListening}
          className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-lg transition-all duration-300 ${
            isListening
              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50 scale-105"
              : "bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30"
          }`}
          title={isListening ? "Listening... Tap to stop" : `Speak to ${profile.name}`}
        >
          {isListening ? (
            <>
              <span className="absolute inset-0 rounded-xl bg-emerald-400 animate-ping opacity-40" />
              <span>🎙️</span>
            </>
          ) : (
            <span>🎙️</span>
          )}
        </button>

        {/* Text Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            id="iris-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? `Listening to your voice for ${profile.name}...`
                : state === "thinking"
                ? `${profile.name} is thinking...`
                : `Talk to ${profile.name} or tap mic to speak...`
            }
            disabled={state === "thinking"}
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 px-2 py-1.5 focus:outline-none font-sans"
          />

          {/* Send Button */}
          <button
            id="iris-send-button"
            type="submit"
            disabled={!inputText.trim() || state === "thinking"}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90 active:scale-95 text-white font-bold transition-all disabled:opacity-30 disabled:pointer-events-none text-base"
            title="Send query"
          >
            <span>💬</span>
          </button>
        </form>

        {/* Mute Toggle */}
        <button
          id="iris-mute-button"
          type="button"
          onClick={onToggleMute}
          className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all text-base ${
            isMuted
              ? "bg-rose-950/60 text-rose-400 border border-rose-800/50"
              : "bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:bg-slate-800"
          }`}
          title={isMuted ? `Unmute ${profile.name} Voice` : `Mute ${profile.name} Voice`}
        >
          <span>{isMuted ? "🔇" : "🔊"}</span>
        </button>
      </div>
    </div>
  );
};
