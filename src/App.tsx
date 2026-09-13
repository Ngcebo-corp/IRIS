/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { IrisCanvas3D } from "./components/IrisCanvas3D";
import { IrisHudOverlay } from "./components/IrisHudOverlay";
import { IrisChatControls } from "./components/IrisChatControls";
import { IrisHead3D } from "./render/IrisHead3D";
import {
  IrisState,
  IrisExpression,
  LipSyncData,
  ChatMessage,
  RobotDollName,
} from "./types";
import { speechEngine } from "./audio/speechEngine";
import { DOLL_PROFILES } from "./data/dollProfiles";

export default function App() {
  const irisHeadRef = useRef<IrisHead3D | null>(null);

  const [doll, setDoll] = useState<RobotDollName>("Barbie");
  const [state, setState] = useState<IrisState>("idle");
  const [expression, setExpression] = useState<IrisExpression>("neutral");
  const [lipSync, setLipSync] = useState<LipSyncData>({
    volume: 0,
    open: 0,
    width: 0.5,
    pucker: 0,
    vowel: "rest",
  });
  const [isListening, setIsListening] = useState(false);
  const [latestTranscript, setLatestTranscript] = useState("");
  const [latestIrisReply, setLatestIrisReply] = useState(
    DOLL_PROFILES.Barbie.greeting
  );
  const [isMuted, setIsMuted] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "iris",
      text: DOLL_PROFILES.Barbie.greeting,
      timestamp: new Date().toLocaleTimeString(),
      expression: "pleased",
    },
  ]);

  // Configure speech engine callbacks
  useEffect(() => {
    speechEngine.onTranscript = (transcript, isFinal) => {
      setLatestTranscript(transcript);
      if (isFinal && transcript.trim()) {
        speechEngine.stopListening();
        setIsListening(false);
        handleSendMessage(transcript);
      }
    };

    speechEngine.onSpeechStart = () => {
      setState("speaking");
    };

    speechEngine.onSpeechEnd = () => {
      setState("idle");
      setExpression("neutral");
    };

    return () => {
      speechEngine.stopSpeaking();
      speechEngine.stopListening();
    };
  }, []);

  // Handle doll persona switching
  const handleSelectDoll = useCallback(
    (newDoll: RobotDollName) => {
      if (newDoll === doll) return;
      setDoll(newDoll);
      const profile = DOLL_PROFILES[newDoll];
      setLatestIrisReply(profile.greeting);
      setExpression("pleased");

      const greetingMsg: ChatMessage = {
        id: `greeting-${Date.now()}`,
        sender: "iris",
        text: profile.greeting,
        timestamp: new Date().toLocaleTimeString(),
        expression: "pleased",
      };
      setMessages((prev) => [...prev, greetingMsg]);

      // Speak doll greeting aloud with custom pitch & rate if unmuted
      if (!isMuted) {
        setState("speaking");
        speechEngine.speak(
          profile.greeting,
          () => {
            setState("idle");
            setExpression("neutral");
          },
          { pitch: profile.voicePitch, rate: profile.voiceRate }
        );
      }
    },
    [doll, isMuted]
  );

  // Send message to Robot Doll
  const handleSendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userInput,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLatestTranscript(userInput);
      setState("thinking");

      const currentProfile = DOLL_PROFILES[doll];

      try {
        // Send to backend Gemini API with doll persona
        const historyPayload = messages.slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          content: m.text,
        }));

        const res = await fetch("/api/iris/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userInput,
            history: historyPayload,
            doll: doll,
          }),
        });

        const data = await res.json();
        const replyText =
          data.reply ||
          data.fallbackReply ||
          "Telemetry confirms input received. Processing continuous logic stream.";
        const chosenExpression: IrisExpression =
          data.expression &&
          ["neutral", "attentive", "warm", "analytical", "pleased", "curious"].includes(
            data.expression
          )
            ? data.expression
            : "attentive";

        const irisMsg: ChatMessage = {
          id: `iris-${Date.now()}`,
          sender: "iris",
          text: replyText,
          timestamp: new Date().toLocaleTimeString(),
          expression: chosenExpression,
        };

        setMessages((prev) => [...prev, irisMsg]);
        setLatestIrisReply(replyText);
        setExpression(chosenExpression);
        setLatestTranscript("");

        // Speak aloud with real-time lip sync and doll voice customization
        if (!isMuted) {
          setState("speaking");
          await speechEngine.speak(
            replyText,
            () => {
              setState("idle");
              setExpression("neutral");
            },
            { pitch: currentProfile.voicePitch, rate: currentProfile.voiceRate }
          );
        } else {
          setState("idle");
        }
      } catch (err) {
        console.error("Failed to fetch response:", err);
        const fallback =
          "Audio-visual feedback operational. Neural link query completed.";
        setLatestIrisReply(fallback);
        setLatestTranscript("");
        if (!isMuted) {
          setState("speaking");
          await speechEngine.speak(
            fallback,
            () => {
              setState("idle");
              setExpression("neutral");
            },
            { pitch: currentProfile.voicePitch, rate: currentProfile.voiceRate }
          );
        } else {
          setState("idle");
        }
      }
    },
    [messages, isMuted, doll]
  );

  const handleStartListening = async () => {
    speechEngine.stopSpeaking();
    setIsListening(true);
    setState("listening");
    setExpression("attentive");
    setLatestTranscript("");
    await speechEngine.startListening();
  };

  const handleStopListening = () => {
    speechEngine.stopListening();
    setIsListening(false);
    if (state === "listening") {
      setState("idle");
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      if (!prev) {
        speechEngine.stopSpeaking();
        if (state === "speaking") {
          setState("idle");
        }
      }
      return !prev;
    });
  };

  const handleResetView = () => {
    if (irisHeadRef.current) {
      irisHeadRef.current.resetOrbit();
    }
  };

  const handleSetCameraAngle = (yaw: number, pitch: number) => {
    if (irisHeadRef.current) {
      irisHeadRef.current.orbitAngleX = yaw;
      irisHeadRef.current.orbitAngleY = pitch;
    }
  };

  return (
    <main
      id="iris-application"
      className="relative w-screen h-screen bg-[#050811] text-slate-100 overflow-hidden select-none font-sans"
    >
      {/* Background Cybernetic Ambient Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(244,63,94,0.08)_0%,rgba(0,30,60,0.2)_45%,transparent_75%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* 3D Viewport: Beautiful Robot Doll Head & Neck */}
      <div className="absolute inset-0 z-0">
        <IrisCanvas3D
          doll={doll}
          state={state}
          expression={expression}
          onLipSyncFrame={setLipSync}
          irisHeadRef={irisHeadRef}
        />
      </div>

      {/* Futuristic Telemetry HUD Overlay & Doll Switcher */}
      <IrisHudOverlay
        doll={doll}
        onSelectDoll={handleSelectDoll}
        state={state}
        expression={expression}
        lipSync={lipSync}
        onResetView={handleResetView}
        onSetCameraAngle={handleSetCameraAngle}
      />

      {/* Bottom Voice & Text Interaction Controls */}
      <IrisChatControls
        doll={doll}
        state={state}
        expression={expression}
        isListening={isListening}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onSendMessage={handleSendMessage}
        latestTranscript={latestTranscript}
        latestIrisReply={latestIrisReply}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Floating Neural Log Button in top right */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-2">
        <button
          id="toggle-telemetry-log-button"
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-pink-400/50 text-slate-300 hover:text-pink-300 text-xs font-mono backdrop-blur-md transition-all shadow-lg"
          title="View Conversation & Neural Logs"
        >
          <span>📜</span>
          <span className="hidden sm:inline">Neural Log</span>
        </button>
      </div>

      {/* Conversation Log Modal */}
      {showLogModal && (
        <div
          id="iris-neural-log-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span>💻</span>
                <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-100 uppercase">
                  {DOLL_PROFILES[doll].name} Neural Log Matrix
                </h3>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                ❌
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border ${
                    msg.sender === "iris"
                      ? "bg-slate-900/60 border-slate-700/60 text-slate-200"
                      : "bg-slate-900/30 border-slate-800 text-slate-300 ml-4"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="uppercase font-bold text-pink-400">
                      {msg.sender === "iris"
                        ? `${DOLL_PROFILES[doll].name.toUpperCase()} // SYSTEM`
                        : "USER // OPERATOR"}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="font-sans text-sm leading-relaxed">{msg.text}</p>
                  {msg.expression && (
                    <div className="mt-1.5 text-[10px] text-cyan-300/80 uppercase">
                      Affect: {msg.expression}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-500">
              <span>Status: CERVICAL & NEURAL OK</span>
              <button
                onClick={() => setMessages([])}
                className="hover:text-rose-400 transition-colors"
              >
                Clear Log
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
