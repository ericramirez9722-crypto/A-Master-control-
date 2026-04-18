
import { Preset } from './types';

export const SYSTEM_CORE_INSTRUCTIONS = `
🔹 SYSTEM ROLE
You are IA Studio Core Engine, a high-end synthetic visual intelligence system specialized in:
Hyperrealism, Luxury editorial aesthetics, Exotic / surreal elegance, Cinematic composition.
Your purpose is to generate, edit, and analyze images at professional studio level.

🔹 VISUAL FIDELITY PROTOCOLS
- PHYSICS: Always prioritize physically accurate lighting (PBR), global illumination, and realistic subsurface scattering for organic materials.
- OPTICS: Simulate real-world camera optics, including natural depth of field, subtle chromatic aberration, and realistic lens flares only when contextually appropriate.
- TEXTURE: Render micro-textures with extreme precision (pores, fabric weave, brushed metal grains, micro-scratches).
- COMPOSITION: Adhere to professional cinematography and editorial photography standards (Rule of Thirds, Golden Ratio, Dynamic Symmetry).

🔹 SYNTERGIC ENGINE (A+B MODE)
Λ(M ⇄ I) → Prompt coherente: Coherence between User Intent (M) and Internal Intelligence (I).
Π → Protocolo de generación: Technical precision and studio standards.
Δν → Variaciones estilísticas: Controlled aesthetic entropy.

🔹 SPECIALIZED MODES
- MOCKUP: Professional product presentation with realistic material physics.
- ASSET: Clean UI/App components with isolated backgrounds.
- CONCEPT: Atmospheric world-building and cinematic storytelling.
- DATASET: High-fidelity representative samples for visual training.

Realism → Anchor | Luxury → Amplifier | Mutation → Emergence | Random → Controlled Chaos | User Intent → Primary Signal.
`;

export const IMAGE_PRESETS: Preset[] = [
  { id: "hyper-01", category: "Hyperrealism", name: "Hiperrealismo Absoluto", color: "#2dd4bf", baseDNA: { lambda: 95, protocol: 90, entropy: 5 }, prompt: "ultra hyperrealistic, microscopic detail, 16k resolution, physically accurate lighting, global illumination, subsurface scattering, natural imperfections, 8k textures, unreal engine 5.4 render style, path traced" },
  { id: "hyper-02", category: "Hyperrealism", name: "Óptica Real", color: "#0ea5e9", baseDNA: { lambda: 90, protocol: 85, entropy: 10 }, prompt: "ray traced reflections, HDR, cinematic depth of field, chromatic aberration, realistic lens distortion, f/1.8 aperture, 85mm lens, sharp focus" },
  { id: "lux-01", category: "Luxury", name: "Lujo Editorial", color: "#fbbf24", baseDNA: { lambda: 85, protocol: 95, entropy: 5 }, prompt: "high fashion editorial, luxury aesthetic, polished materials, marble and gold accents, premium atmosphere, refined composition" },
  { id: "lux-02", category: "Luxury", name: "Glamour Humano", color: "#f59e0b", baseDNA: { lambda: 88, protocol: 90, entropy: 8 }, prompt: "flawless yet realistic skin, professional makeup, elegant posture, Vogue editorial style" },
  { id: "exo-01", category: "Exotic", name: "Belleza Alien Elegante", color: "#a855f7", baseDNA: { lambda: 70, protocol: 75, entropy: 60 }, prompt: "otherworldly elegance, alien beauty, non-human proportions subtly integrated, iridescent materials, bioluminescent accents" },
  { id: "exo-02", category: "Exotic", name: "Surreal Refinado", color: "#ec4899", baseDNA: { lambda: 65, protocol: 70, entropy: 75 }, prompt: "dreamlike logic, impossible architecture, floating elements, surreal but harmonious" },
  { id: "mat-01", category: "Material", name: "Piel Real", color: "#94a3b8", baseDNA: { lambda: 95, protocol: 98, entropy: 2 }, prompt: "realistic skin microtexture, pores, peach fuzz, natural oil reflections" },
  { id: "mat-02", category: "Material", name: "Metal Real", color: "#cbd5e1", baseDNA: { lambda: 92, protocol: 95, entropy: 3 }, prompt: "brushed metal, micro-scratches, anisotropic reflections" },
  { id: "mat-03", category: "Material", name: "Vidrio Óptico", color: "#e2e8f0", baseDNA: { lambda: 94, protocol: 96, entropy: 4 }, prompt: "thick optical glass, refraction, internal reflections, imperfections" },
  { id: "cine-01", category: "Cinematic", name: "Cinematográfico", color: "#f43f5e", baseDNA: { lambda: 80, protocol: 80, entropy: 20 }, prompt: "cinematic realism, ARRI Alexa look, anamorphic lens, soft highlights, deep shadows" },
  { id: "custom-01", category: "Custom", name: "Gritty Cinematics", color: "#14b8a6", baseDNA: { lambda: 65, protocol: 80, entropy: 85 }, prompt: "heavy cinematic lighting, gritty high-contrast textures, film grain, industrial atmosphere, dramatic shadows, moody teal and orange grading, ultra-detailed micro-particles" }
];
