export type RobotDollName = "Barbie" | "Moana" | "Iris";

export interface DollProfile {
  id: RobotDollName;
  name: string;
  emoji: string;
  title: string;
  tagline: string;
  themeColor: string;
  accentBadge: string;
  dermalColor: number;
  dermalRoughness: number;
  dermalMetalness: number;
  shellColor: number;
  trimColor: number;
  glowColor: number;
  glowEmissive: number;
  irisColor: number;
  innerIrisColor: number;
  lipColor: number;
  eyebrowColor: number;
  hairColor: number;
  accessoryColor: number;
  voicePitch: number;
  voiceRate: number;
  greeting: string;
  samplePrompts: string[];
}

export type IrisState = "idle" | "listening" | "thinking" | "speaking";

export type IrisExpression =
  | "neutral"
  | "attentive"
  | "warm"
  | "analytical"
  | "pleased"
  | "curious";

export interface LipSyncData {
  volume: number; // 0 to 1
  open: number; // 0 to 1 (jaw opening)
  width: number; // 0 to 1 (mouth width)
  pucker: number; // 0 to 1 (lip rounding)
  vowel: "rest" | "A" | "O" | "E" | "M";
}

export interface HeadPose {
  pitch: number; // looking up/down (radians)
  yaw: number; // looking left/right (radians)
  roll: number; // tilt side to side (radians)
  neckY: number; // neck compression/expansion
}

export interface EyePose {
  lookX: number; // -1 to 1
  lookY: number; // -1 to 1
  blink: number; // 0 (open) to 1 (fully closed)
  pupilDilation: number; // 0.6 to 1.4
  glowIntensity: number; // 0 to 1
}

export interface TelemetryData {
  neuralLoad: number; // percentage
  coreTemp: number; // Celsius
  audioFrequency: number; // Hz
  voiceSynthesizerOutput: number; // dB
  cervicalStress: number; // percentage
  opticAperture: number; // mm
}

export interface ChatMessage {
  id: string;
  sender: "user" | "iris";
  text: string;
  timestamp: string;
  expression?: IrisExpression;
}
