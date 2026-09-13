import React, { useEffect, useRef } from "react";
import { IrisHead3D } from "../render/IrisHead3D";
import { IrisState, IrisExpression, LipSyncData, RobotDollName } from "../types";
import { speechEngine } from "../audio/speechEngine";

interface IrisCanvas3DProps {
  doll: RobotDollName;
  state: IrisState;
  expression: IrisExpression;
  onLipSyncFrame?: (data: LipSyncData) => void;
  irisHeadRef: React.MutableRefObject<IrisHead3D | null>;
}

export const IrisCanvas3D: React.FC<IrisCanvas3DProps> = ({
  doll,
  state,
  expression,
  onLipSyncFrame,
  irisHeadRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize 3D robotic doll head
    const iris = new IrisHead3D(containerRef.current, doll);
    irisHeadRef.current = iris;

    // Lip-sync ticker loop
    const syncLoop = () => {
      if (irisHeadRef.current) {
        const isSpeaking = irisHeadRef.current.state === "speaking";
        const isListening = irisHeadRef.current.state === "listening";

        let frame: LipSyncData;
        if (isSpeaking) {
          frame = speechEngine.getLipSyncFrame(true);
        } else if (isListening) {
          const micVol = speechEngine.getMicVolume();
          frame = {
            volume: micVol,
            open: 0,
            width: 0.5,
            pucker: 0,
            vowel: "rest",
          };
        } else {
          frame = {
            volume: 0,
            open: 0,
            width: 0.5,
            pucker: 0,
            vowel: "rest",
          };
        }

        irisHeadRef.current.lipSync = frame;
        onLipSyncFrame?.(frame);
      }
      rafId.current = requestAnimationFrame(syncLoop);
    };

    rafId.current = requestAnimationFrame(syncLoop);

    return () => {
      cancelAnimationFrame(rafId.current);
      iris.destroy();
      irisHeadRef.current = null;
    };
  }, []);

  // Update state, expression, & doll on prop changes
  useEffect(() => {
    if (irisHeadRef.current) {
      irisHeadRef.current.state = state;
      irisHeadRef.current.expression = expression;
      irisHeadRef.current.setDoll(doll);
    }
  }, [state, expression, doll]);

  return (
    <div
      ref={containerRef}
      id="iris-3d-canvas-container"
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden touch-none"
    />
  );
};
