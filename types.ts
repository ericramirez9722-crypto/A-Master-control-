
export type Mode = "generate" | "edit" | "vision" | "evolution" | "inpaint" | "color-grading" | "style-transfer" | "upscale" | "mockup" | "asset" | "concept" | "dataset" | "worldbuilding" | "texture";

export interface SyntergicDNA {
  lambda: number;   // Λ Coherence (0-100)
  protocol: number; // Π Protocol/Structure (0-100)
  entropy: number;  // Δν Entropy/Variation (0-100)
}

export interface Preset {
  id: string;
  name: string;
  prompt: string;
  category: "Hyperrealism" | "Luxury" | "Exotic" | "Material" | "Cinematic" | "Custom";
  color?: string; // Hex or CSS gradient for subtle background elements
  baseDNA?: SyntergicDNA;
}

export interface GenerationState {
  loading: boolean;
  error: string | null;
  result: string | null;
}

export interface RoomState {
  filters: { brightness: number; contrast: number; saturation: number };
  grading: {
    hue: number;
    shadowsR: number; shadowsG: number; shadowsB: number;
    midtonesR: number; midtonesG: number; midtonesB: number;
    highlightsR: number; highlightsG: number; highlightsB: number;
    blacks: number; shadows: number; midtones: number; highlights: number; whites: number;
  };
  prompt: string;
  mode: Mode;
  sourceImage: string | null;
  resultImage: string | null;
  mask: string | null;
  activePreset: string | null;
}

export interface User {
  id: string;
  name: string;
  color: string;
  mode?: Mode;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: string;
  x: number;
  y: number;
}

export interface BatchItem {
  id: string;
  source: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
}
