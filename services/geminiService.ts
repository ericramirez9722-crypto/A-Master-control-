
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_CORE_INSTRUCTIONS } from "../constants";
import { retryManager } from "../lib/retryManager";

export class GeminiService {
  private onRetryCallback?: (attempt: number, error: any) => void;

  setOnRetry(callback: (attempt: number, error: any) => void) {
    this.onRetryCallback = callback;
  }

  private async executeNeuralOperation<T>(
    operationId: string, 
    fn: (signal: AbortSignal) => Promise<T>, 
    isPro: boolean = false
  ): Promise<T> {
    return retryManager({
      operationId,
      fn,
      maxRetries: 3,
      baseDelay: 2000,
      timeoutMs: isPro ? 45000 : 30000,
      onRetry: this.onRetryCallback,
      onFail: (error) => {
        const errorStr = (error?.message || JSON.stringify(error)).toLowerCase();
        if (errorStr.includes("403") || errorStr.includes("permission_denied")) {
          if (isPro) {
            throw new Error("PRO_PERMISSION_DENIED: El modelo Gemini 3 Pro requiere una API Key de un proyecto con facturación activa.");
          }
          throw new Error("PERMISSION_DENIED: No tienes permisos para acceder a este modelo.");
        }
        if (errorStr.includes("requested entity was not found") || errorStr.includes("key_not_found")) {
          throw new Error("KEY_NOT_FOUND: La API Key seleccionada no es válida para este modelo.");
        }
      }
    });
  }

  async generateImage(prompt: string, presetPrompt?: string, highQuality: boolean = false, useSearch: boolean = false, aspectRatio: string = "1:1", negativePrompt?: string): Promise<string> {
    const modelName = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    return this.executeNeuralOperation(`generate-${prompt.substring(0, 10)}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // ... rest of the implementation
      const finalPrompt = presetPrompt ? `${prompt}. Style constraints: ${presetPrompt}` : prompt;
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `${SYSTEM_CORE_INSTRUCTIONS}\n\nUSER INTENT (GENERATE): ${finalPrompt}${negativeInstruction}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: fullContextPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: highQuality ? "1K" : undefined
          },
          tools: useSearch ? [{
            googleSearch: {
              searchTypes: {
                webSearch: {},
                imageSearch: {}
              }
            }
          }] : undefined
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data found in the response.");
    }, highQuality);
  }

  async editImage(base64Image: string, prompt: string, presetPrompt?: string, highQuality: boolean = true, aspectRatio: string = "1:1", negativePrompt?: string): Promise<string> {
    const modelName = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    return this.executeNeuralOperation(`edit-${prompt.substring(0, 10)}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const finalPrompt = presetPrompt ? `${prompt}. Visual Signature: ${presetPrompt}` : prompt;
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `${SYSTEM_CORE_INSTRUCTIONS}\n\nUSER INTENT (EDIT): ${finalPrompt}${negativeInstruction}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
        config: {
          imageConfig: {
            imageSize: highQuality ? "1K" : undefined,
            aspectRatio: aspectRatio as any
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("Neural Engine failed to return edited data.");
    }, highQuality);
  }

  async inpaintImage(base64Image: string, maskBase64: string, prompt: string, presetPrompt?: string, negativePrompt?: string): Promise<string> {
    return this.executeNeuralOperation(`inpaint-${prompt.substring(0, 10)}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanImg = base64Image.split(',')[1] || base64Image;
      const cleanMask = maskBase64.split(',')[1] || maskBase64;
      const finalPrompt = presetPrompt ? `${prompt}. Preset style: ${presetPrompt}` : prompt;
      
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `${SYSTEM_CORE_INSTRUCTIONS}\n\nTASK: INPAINTING.
The first image is the original scene. 
The second image is a binary mask where white areas indicate the region to be regenerated.
The third part is the user prompt describing what should appear in that masked region.
USER INTENT (INPAINT): ${finalPrompt}${negativeInstruction}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: cleanImg, mimeType: 'image/png' } },
            { inlineData: { data: cleanMask, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("Neural Engine failed to return inpainted data.");
    });
  }

  async analyzeForRefinement(base64Image: string, originalPrompt: string): Promise<string> {
    return this.executeNeuralOperation('refinement-analysis', async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: `Analyze this image against: "${originalPrompt}". Provide a more technical and detailed prompt to improve its realism.` },
          ],
        },
        config: { systemInstruction: SYSTEM_CORE_INSTRUCTIONS }
      });
      return response.text || "";
    });
  }

  async analyzeImage(base64Image: string): Promise<any> {
    return this.executeNeuralOperation('visual-analysis', async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: `Perform a comprehensive technical and semantic analysis of this image. 
            Your primary task is to DETECT and LIST all specific objects within the image.
            
            Return ONLY a JSON object with the following structure:
            {
              "scene": {
                "description": "General description of the scene",
                "mood": "Atmosphere and emotional tone",
                "lighting": "Technical lighting analysis (e.g., volumetric, rim, high-key)",
                "composition": "Framing, perspective, and rule-of-thirds details"
              },
              "objects": [
                { 
                  "name": "Specific object name (e.g., 'Vintage Leica Camera', 'Blue Silk Scarf')", 
                  "box_2d": [ymin, xmin, ymax, xmax],
                  "details": "Brief but high-fidelity description of the object's appearance, material, and state" 
                }
              ],
              "moderation": {
                "safety_status": "Safe / Caution / Restricted",
                "flags": ["list of potential issues or 'none'"],
                "reasoning": "Brief explanation of the safety status"
              },
              "technical_prompt": "A high-fidelity reconstruction prompt based on this analysis, suitable for a professional image generator"
            }` },
          ],
        },
        config: { 
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS,
          responseMimeType: "application/json"
        }
      });
      try {
        return JSON.parse(response.text || "{}");
      } catch (e) {
        return { error: "Failed to parse neural analysis.", raw: response.text };
      }
    });
  }

  async searchSpecificObjects(base64Image: string, query: string): Promise<any[]> {
    return this.executeNeuralOperation('object-search', async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: `Search for the following objects in this image: "${query}". 
            For each object found, provide its name, a brief description, and its bounding box coordinates.
            Coordinates must be in the format [ymin, xmin, ymax, xmax] where values are normalized from 0 to 1000.
            Return ONLY a JSON array of objects:
            [
              { "name": "Object name", "box_2d": [ymin, xmin, ymax, xmax], "details": "Brief description" }
            ]` },
          ],
        },
        config: { 
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS,
          responseMimeType: "application/json"
        }
      });
      try {
        return JSON.parse(response.text || "[]");
      } catch (e) {
        return [];
      }
    });
  }

  async suggestColorGrading(base64Image: string): Promise<any> {
    return this.executeNeuralOperation('color-grading-suggestions', async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: "Analyze this image and suggest professional color grading parameters. Return ONLY a JSON object with values between -100 and 100 for: brightness, contrast, saturation, hue, shadowsR, shadowsG, shadowsB, midtonesR, midtonesG, midtonesB, highlightsR, highlightsG, highlightsB, blacks, shadows, midtones, highlights, whites." },
          ],
        },
        config: { 
          systemInstruction: "You are a professional colorist. Your goal is to enhance images with high-end cinematic color grading. Return only valid JSON.",
          responseMimeType: "application/json"
        }
      });
      try {
        return JSON.parse(response.text || "{}");
      } catch (e) {
        throw new Error("Failed to parse neural color suggestions.");
      }
    });
  }

  async styleTransfer(contentImage: string, styleImage: string, prompt: string, intensity: number = 80, negativePrompt?: string): Promise<string> {
    return this.executeNeuralOperation(`style-transfer-${prompt.substring(0, 10)}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanContent = contentImage.split(',')[1] || contentImage;
      const cleanStyle = styleImage.split(',')[1] || styleImage;
      
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `${SYSTEM_CORE_INSTRUCTIONS}\n\nTASK: STYLE TRANSFER.
Apply the artistic style, color palette, and aesthetic of the SECOND image to the content of the FIRST image.
Maintain the structural integrity of the first image while adopting the visual signature of the second.
STYLE INTENSITY: ${intensity}%. (0% means no change, 100% means full transformation).
USER INTENT: ${prompt}${negativeInstruction}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: cleanContent, mimeType: 'image/png' } },
            { inlineData: { data: cleanStyle, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("Neural Engine failed to return style-transferred data.");
    });
  }

  async upscaleImage(base64Image: string, factor: string, aspectRatio: string = "1:1"): Promise<string> {
    const sizeMap: Record<string, string> = {
      "2x": "1K",
      "4x": "2K",
      "8x": "4K"
    };
    const targetSize = sizeMap[factor] || "2K";

    return this.executeNeuralOperation(`upscale-${factor}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      
      const fullContextPrompt = `${SYSTEM_CORE_INSTRUCTIONS}\n\nTASK: AI UPSCALE.
Increase the resolution and detail of the provided image.
TARGET RESOLUTION: ${targetSize}.
Maintain absolute fidelity to the original composition, colors, and subject.
Enhance micro-textures, sharpness, and clarity to professional studio standards.
Remove any compression artifacts or noise.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
        config: {
          imageConfig: {
            imageSize: targetSize as any,
            aspectRatio: aspectRatio as any
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("Neural Engine failed to return upscaled data.");
    }, true);
  }

  async parseIntent(prompt: string): Promise<string> {
    return this.executeNeuralOperation(`parse-intent-${prompt.substring(0, 10)}`, async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `
            ACT AS: Syntergic Intent Parser (Λ-Layer).
            TASK: Translate the following raw user intent into a structured, high-fidelity visual description for a professional image generator.
            
            RAW INTENT: "${prompt}"
            
            OUTPUT FORMAT:
            Environment: [Hyper-detailed description of the setting, including atmospheric conditions]
            Style: [Specific aesthetic, mood, and artistic/cinematic references]
            Lighting: [Technical optical details: PBR, global illumination, light sources, shadows]
            Density: [Complexity level, micro-textures, and material properties]
            Perspective: [Camera angle, lens type (e.g., 35mm, 85mm), framing, and depth of field]
            
            Keep it professional, editorial, and hyper-detailed. Use technical terminology from photography and CGI rendering.
          ` }],
        },
        config: { systemInstruction: SYSTEM_CORE_INSTRUCTIONS }
      });
      return response.text || prompt;
    });
  }

  async syntergicGenerate(
    prompt: string, 
    mode: 'mockup' | 'asset' | 'concept' | 'dataset' | 'worldbuilding',
    params: { lambda: number; pi: number; deltaNu: number },
    highQuality: boolean = true,
    variationCount: number = 1,
    aspectRatio: string = "1:1",
    negativePrompt?: string
  ): Promise<string[]> {
    const modelName = highQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    // Λ - Coherence Layer: Parse intent first if lambda is high
    const structuredPrompt = params.lambda > 50 ? await this.parseIntent(prompt) : prompt;

    const modeInstructions: Record<string, string> = {
      mockup: "Generate a professional, high-fidelity product mockup. Focus on realistic lighting, material textures (glass, metal, plastic), and clean presentation. The product should look ready for a marketing campaign.",
      asset: "Generate a clean, high-quality UI asset or icon. Focus on transparency-friendly backgrounds (solid or simple), consistent stroke weights, and modern aesthetic. Suitable for mobile or web applications.",
      concept: "Generate an evocative, high-end concept art piece. Focus on cinematic composition, atmospheric lighting, and world-building details. Prioritize mood and storytelling over literal representation.",
      dataset: "Generate a high-quality visual sample for a machine learning dataset. Focus on clear subject isolation, varied angles, and consistent lighting. The output should be representative of a specific category.",
      worldbuilding: "Generate a comprehensive visual representation of a world element. Focus on architectural coherence, cultural depth, and environmental storytelling. This is part of a larger universe."
    };

    const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
    const syntergicContext = `
SYNTERGIC ENGINE ACTIVATED:
Λ (Coherence/Intent): ${params.lambda}% - Strict adherence to structured intent.
Π (Protocol/Execution): ${params.pi}% - Apply professional studio standards.
Δν (Stylistic Variation): ${params.deltaNu}% - Controlled aesthetic entropy.

TASK: ${mode.toUpperCase()}
${modeInstructions[mode]}

STRUCTURED INTENT:
${structuredPrompt}${negativeInstruction}
`;

    const results: string[] = [];
    const actualVariationCount = Math.max(variationCount, params.deltaNu > 70 ? 2 : 1);

    for (let i = 0; i < actualVariationCount; i++) {
      const variationSeed = i > 0 ? `\nVariation ${i+1}: Focus on a different angle or lighting nuance while maintaining coherence.` : "";
      const res = await this.executeNeuralOperation(`syntergic-${mode}-${i}`, async (signal) => {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [{ text: `${SYSTEM_CORE_INSTRUCTIONS}\n\n${syntergicContext}${variationSeed}` }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: highQuality ? "1K" : undefined
            },
          }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        throw new Error("Syntergic Engine failed to synthesize visual data.");
      }, highQuality);
      results.push(res);
    }
    
    return results;
  }

  async worldbuild(
    universeIntent: string,
    params: { lambda: number; pi: number; deltaNu: number }
  ): Promise<{ category: string; image: string }[]> {
    const categories = ["Environment", "Vehicle", "Character", "Technology"];
    const results: { category: string; image: string }[] = [];

    for (const cat of categories) {
      const catPrompt = `Part of a ${universeIntent} universe: A high-end ${cat} design.`;
      const images = await this.syntergicGenerate(catPrompt, 'worldbuilding', params, true);
      results.push({ category: cat, image: images[0] });
    }

    return results;
  }

  async suggestEnhancements(prompt: string, mode: string): Promise<{ enhanced: string; keywords: string[] }> {
    return this.executeNeuralOperation('prompt-enhancement', async (signal) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `
            ACT AS: Professional Prompt Engineer & Visual Consultant.
            TASK: Analyze the following user prompt for the specified mode and suggest an enhanced version plus a list of 5-8 high-impact keywords to improve visual fidelity.
            
            MODE: "${mode}"
            USER PROMPT: "${prompt}"
            
            GUIDELINES:
            - If mode is "generate", focus on hyper-realistic lighting (PBR), cinematic composition, micro-textures, and optical realism.
            - If mode is "edit", focus on maintaining consistency while describing the change with high-fidelity technical terms.
            - If mode is "texture", focus on PBR properties (albedo, roughness, normal, height, metallic) and microscopic surface details.
            - If mode is "worldbuilding", focus on environmental storytelling, atmospheric perspective, and grand scale.
            - If mode is "mockup", focus on professional product photography, studio lighting (rim light, softboxes), and realistic material physics.
            - ALWAYS inject technical photography or rendering terms (e.g., "subsurface scattering", "global illumination", "ray-traced", "8k textures").
            
            RETURN ONLY A JSON OBJECT:
            {
              "enhanced": "The full enhanced prompt string",
              "keywords": ["keyword1", "keyword2", ...]
            }
          ` }],
        },
        config: { 
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS,
          responseMimeType: "application/json"
        }
      });
      try {
        return JSON.parse(response.text || "{}");
      } catch (e) {
        return { enhanced: prompt, keywords: [] };
      }
    });
  }
}

export const gemini = new GeminiService();
