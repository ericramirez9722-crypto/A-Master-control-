
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
