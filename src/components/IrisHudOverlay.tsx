import React from "react";
import { IrisState, IrisExpression, LipSyncData, RobotDollName } from "../types";
import { DOLL_PROFILES } from "../data/dollProfiles";

interface IrisHudOverlayProps {
  doll: RobotDollName;
  onSelectDoll: (doll: RobotDollName) => void;
  state: IrisState;
  expression: IrisExpression;
  lipSync: LipSyncData;
  onResetView: () => void;
  onSetCameraAngle: (yaw: number, pitch: number) => void;
}

export const IrisHudOverlay: React.FC<IrisHudOverlayProps> = ({
  doll,
  onSelectDoll,
  state,
  expression,
  lipSync,
  onResetView,
  onSetCameraAngle,
}) => {
  const currentProfile = DOLL_PROFILES[doll];

  // Status label & styling
  const getStatusBadge = () => {
    switch (state) {
      case "listening":
        return {
          emoji: "🎙️",
          label: "AUDITORY MATRIX // LISTENING",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
          dotColor: "bg-emerald-400 animate-ping",
        };
      case "thinking":
        return {
          emoji: "🧠",
          label: "NEURAL COGNITION // COMPUTING",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/50",
          dotColor: "bg-amber-400 animate-pulse",
        };
      case "speaking":
        return {
          emoji: "👄",
          label: "VOCAL TRANSDUCER // TRANSMITTING",
          color: "bg-rose-500/20 text-rose-300 border-rose-500/50",
          dotColor: "bg-rose-400 animate-pulse",
        };
      case "idle":
      default:
        return {
          emoji: "🤖",
          label: "STANDBY // TRACKING",
          color: "bg-cyan-500/15 text-cyan-300/90 border-cyan-500/40",
          dotColor: "bg-cyan-400",
        };
    }
  };

  const status = getStatusBadge();

  return (
    <div
      id="iris-hud-overlay"
      className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5 select-none z-10"
    >
      {/* Top Header Bar & Doll Persona Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 w-full">
        {/* Unit Identifier */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl text-2xl">
            <span>{currentProfile.emoji}</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.dotColor}`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.dotColor}`}
              />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-slate-100 font-mono">
                {currentProfile.name}
              </h1>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${currentProfile.accentBadge}`}>
                {currentProfile.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans tracking-tight max-w-sm line-clamp-1">
              {currentProfile.tagline}
            </p>
          </div>
        </div>

        {/* Robot Doll Switcher Bar */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 bg-slate-950/85 border border-slate-800/90 rounded-2xl backdrop-blur-xl shadow-2xl">
          {(["Barbie", "Moana", "Iris"] as RobotDollName[]).map((dName) => {
            const prof = DOLL_PROFILES[dName];
            const isSelected = doll === dName;
            return (
              <button
                key={dName}
                id={`doll-selector-${dName.toLowerCase()}`}
                onClick={() => onSelectDoll(dName)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 ${
                  isSelected
                    ? `bg-gradient-to-r ${prof.themeColor} text-white font-bold shadow-lg shadow-black/60 scale-102`
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
                title={`Switch to ${prof.name} - ${prof.title}`}
              >
                <span className="text-sm">{prof.emoji}</span>
                <span>{prof.name}</span>
              </button>
            );
          })}
        </div>

        {/* State Status Pill */}
        <div className="hidden lg:flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono tracking-wider backdrop-blur-md ${status.color}`}
          >
            <span>{status.emoji}</span>
            <span>{status.label}</span>
          </div>
        </div>
      </div>

      {/* Middle Desktop Telemetry HUD (Left & Right) */}
      <div className="flex justify-between items-center w-full my-auto pointer-events-none">
        {/* Left Telemetry Panel */}
        <div className="hidden md:flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-300 w-52 shadow-2xl">
          <div className="flex items-center justify-between text-cyan-400 border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 font-semibold tracking-wider">
              <span>⚡</span> TELEMETRY
            </span>
            <span className="text-[10px] text-emerald-400">ONLINE</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>DOLL DERMAL ALLOY</span>
                <span className="text-cyan-300 font-bold">{doll.toUpperCase()}</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 via-cyan-400 to-amber-400 rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>CERVICAL SPINE (C1-C5)</span>
                <span className="text-cyan-400">NOMINAL</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full w-4/5 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>HYDRAULIC PISTONS</span>
                <span className="text-cyan-400">142 kPa</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-3/4" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>DOLL LASH & BLINK</span>
                <span className="text-pink-400">ACTIVE</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full w-11/12" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Vocalizer & Expression Readout */}
        <div className="hidden md:flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono text-slate-300 w-52 shadow-2xl">
          <div className="flex items-center justify-between text-cyan-400 border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 font-semibold tracking-wider">
              <span>👄</span> VOCALIZER
            </span>
            <span className="text-[10px] uppercase text-cyan-300">
              {lipSync.vowel !== "rest" ? `PHONEME [${lipSync.vowel}]` : "REST"}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>AUDIO FREQUENCY POWER</span>
                <span className="text-cyan-400">
                  {Math.round(lipSync.volume * 100)}%
                </span>
              </div>
              {/* Dynamic Equalizer Bars */}
              <div className="flex items-end gap-1 h-7 pt-1">
                {[45, 80, 60, 95, 70, 85, 40, 65, 90, 50].map((h, i) => {
                  const activeHeight =
                    state === "speaking"
                      ? Math.max(15, h * lipSync.volume + Math.sin(i * 1.5) * 20)
                      : state === "listening"
                      ? Math.max(10, (lipSync.volume || 0.15) * 80)
                      : 10;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-pink-500 via-rose-400 to-cyan-300 rounded-t transition-all duration-75"
                      style={{ height: `${Math.min(100, activeHeight)}%` }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">EMOTION / AFFECT:</span>
              <span className="text-cyan-300 uppercase font-bold tracking-wider">
                {expression}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Camera Orbit Controls & Hint */}
      <div className="flex items-center justify-between w-full pt-2">
        {/* Interaction Hint */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400/80 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-xl backdrop-blur-sm">
          <span>🧭</span>
          <span className="hidden sm:inline">Drag to Orbit {currentProfile.name}&apos;s Doll Head // Scroll to Zoom</span>
          <span className="sm:hidden">Drag to Orbit</span>
        </div>

        {/* View Angle Presets */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/80 border border-slate-800/90 p-1 rounded-xl backdrop-blur-md shadow-lg">
          <button
            id="camera-preset-front"
            onClick={() => onSetCameraAngle(0, 0)}
            className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-colors"
            title="Frontal View"
          >
            Front
          </button>
          <button
            id="camera-preset-three-quarter"
            onClick={() => onSetCameraAngle(0.65, 0.15)}
            className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-colors"
            title="3/4 Isometric View"
          >
            3/4 Neck
          </button>
          <button
            id="camera-preset-profile"
            onClick={() => onSetCameraAngle(1.35, 0.05)}
            className="px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-colors"
            title="Profile / Cervical Spine"
          >
            Profile
          </button>
          <button
            id="camera-reset-view"
            onClick={onResetView}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 rounded-lg transition-colors text-xs"
            title="Reset Orbit"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  );
};
