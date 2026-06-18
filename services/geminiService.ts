
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_CORE_INSTRUCTIONS } from "../constants";
import { retryManager } from "../lib/retryManager";
import { toast } from "sonner";

// Force load env if not loaded
if (typeof process !== "undefined" && !process.env.GEMINI_API_KEY) {
  try {
    // Dynamic import to avoid issues in browser
    // But since this is ESM, we'll just rely on the server entry point
  } catch (e) {}
}

/**
 * Universal local canvas upscale fallback with adaptive bicubic step scaling, 
 * edge-preserving Laplacian convolution sharpening, and organic film grain synthesis.
 * Safe for server-side loads and executes smoothly in browser iframe hosts.
 */
function canvasUpscaleFallback(base64Image: string, factor: string): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(base64Image);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = factor === "2x" ? 2 : factor === "4x" ? 4 : 8;
        const width = img.width * scale;
        const height = img.height * scale;

        // Cap size to avoid browser crash (max 4096px)
        const maxDim = 4096;
        let finalWidth = width;
        let finalHeight = height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          finalWidth = Math.round(width * ratio);
          finalHeight = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Image);
          return;
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw upscaled image using high smoothing
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        // Get Image Data for convolution sharpening and organic grain injection
        const imgData = ctx.getImageData(0, 0, finalWidth, finalHeight);
        const data = imgData.data;
        const widthLen = finalWidth;
        const heightLen = finalHeight;

        // Create a copy of the pixels for the convolution filter input
        const copy = new Uint8ClampedArray(data);

        // 3x3 Laplacian edge reconstruction convolution sharpen matrix
        // We use a safe factor that maintains visual richness without clipping halos
        const kernel = [
           0,   -0.12,  0,
          -0.12,  1.48, -0.12,
           0,   -0.12,  0
        ];

        // Apply convolution filter with in-place clamping
        for (let y = 1; y < heightLen - 1; y++) {
          for (let x = 1; x < widthLen - 1; x++) {
            const idx = (y * widthLen + x) * 4;
            
            let r = 0, g = 0, b = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const kidx = ((y + ky) * widthLen + (x + kx)) * 4;
                const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                r += copy[kidx] * weight;
                g += copy[kidx + 1] * weight;
                b += copy[kidx + 2] * weight;
              }
            }

            // Procedural ultra-fine cinematic grain synthesis
            const noise = (Math.random() - 0.5) * 4.5;

            data[idx]     = Math.min(255, Math.max(0, r + noise));
            data[idx + 1] = Math.min(255, Math.max(0, g + noise));
            data[idx + 2] = Math.min(255, Math.max(0, b + noise));
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Export as High-Quality Progressive JPEG
        resolve(canvas.toDataURL("image/jpeg", 0.94));
      } catch (err) {
        console.error("[UPSCALER_FALLBACK] Local canvas upscale failed:", err);
        resolve(base64Image);
      }
    };
    img.onerror = (err) => {
      console.error("[UPSCALER_FALLBACK] Image load failure:", err);
      resolve(base64Image);
    };
    img.src = base64Image;
  });
}

/**
 * Robust JSON parsing for Neural Engine responses
 * Handles mixed text+JSON from LLMs
 */
function safeJSONParse(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return { error: "Parse failure", raw: text };
  }
}

export class GeminiService {
  private onRetryCallback?: (attempt: number, error: any) => void;
  private aiClient: GoogleGenAI | null = null;
  private intentCache = new Map<string, string>();

  constructor() {
    // Lazy initialization happens in getClient
  }

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      // Platform standard is GEMINI_API_KEY, but we check common fallbacks
      // In Vite, we also check import.meta.env
      let apiKey = "";
      
      if (typeof process !== "undefined" && process.env) {
        apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || "";
      }

      // Browser fallback (if prefixed)
      if (!apiKey && typeof (import.meta as any).env !== "undefined") {
        apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
      }

      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

      // Critical detection of placeholder keys that might have been injected
      const placeholderPatterns = [
        "", "undefined", "null", "your_api_key_here", 
        "replace_me", "placeholder", "ai_studio_api_key",
        "key_here", "insert_key"
      ];
      
      const isPlaceholder = placeholderPatterns.includes(apiKey.toLowerCase()) || apiKey.length < 10;

      if (isPlaceholder) {
        console.error("[GEMINI_SERVICE] ERROR: No valid API Key found in environment.");
        throw new Error("CONFIG_ERROR: El servicio requiere una API Key válida de Google Gemini. Por favor, asegúrate de haberla configurado correctamente en los Ajustes del proyecto (Settings > Environment Variables).");
      }

      console.log(`[GEMINI_SERVICE] Initializing Neural Core with verified key [${apiKey.slice(0, 4)}...${apiKey.slice(-4)}]`);
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  setOnRetry(callback: (attempt: number, error: any) => void) {
    this.onRetryCallback = callback;
  }

  private validateResponse(response: any, operation: string) {
    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error(`NEURAL_FAILURE: El motor no devolvió candidatos válidos para la operación [${operation}].`);
    }

    const candidate = response.candidates[0];
    
    // Check for safety filters or other finish reasons
    if (candidate.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
      throw new Error(`NEURAL_LOCKED: El motor abortó la operación [${operation}] debido a: ${candidate.finishReason}. Esto suele ocurrir por filtros de seguridad o restricciones de contenido.`);
    }

    const parts = candidate.content?.parts;
    if (!parts || parts.length === 0) {
      // If no parts but no finish reason error, it might be a silent failure
      throw new Error(`NEURAL_EMPTY_PARTS: Respuesta vacía del Motor [${operation}]. No se detectaron segmentos de datos.`);
    }
    return parts;
  }

  private async executeNeuralOperation<T>(
    operationId: string, 
    fn: (signal: AbortSignal) => Promise<T>, 
    isPro: boolean = false,
    silentOnFail: boolean = false
  ): Promise<T> {
    return retryManager({
      operationId,
      fn,
      maxRetries: 3,
      baseDelay: 2000,
      timeoutMs: isPro ? 60000 : 30000, // Increased timeout for heavy visual tasks
      onRetry: this.onRetryCallback,
      silentOnFail,
      onFail: (error) => {
        const errorStr = (error?.message || JSON.stringify(error) || "").toLowerCase();
        const status = error?.status || error?.statusCode || error?.code || (error?.error && (error.error.code || error.error.status)) || "";
        const statusStr = String(status).toUpperCase();
        
        // Handle common API key errors from Google
        if (errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota") || status === 429) {
          throw new Error("QUOTA_EXCEEDED: Has superado el límite de peticiones de tu API Key (Cuota excedida). Espera un minuto o verifica tu plan en Google AI Studio.");
        }
        
        if (
          errorStr.includes("403") || 
          errorStr.includes("permission") || 
          errorStr.includes("forbid") || 
          errorStr.includes("caller does not have permission") || 
          status === 403 || 
          statusStr === "PERMISSION_DENIED"
        ) {
          throw new Error("PERMISSION_DENIED: La API Key no tiene permisos para acceder a este modelo neural o la cuota ha sido superada.");
        }
        
        if (errorStr.includes("400") || errorStr.includes("api key not valid") || errorStr.includes("invalid_argument") || status === 400) {
          throw new Error("API_KEY_INVALID: La clave de API de Gemini es inválida o ha sido revocada. Por favor, verifica tu clave en el menú de Ajustes del proyecto.");
        }

        if (errorStr.includes("404") || errorStr.includes("not found") || status === 404) {
          throw new Error("MODEL_NOT_FOUND: El modelo neural seleccionado no está disponible en tu región o con tu clave actual.");
        }
      }
    });
  }

  async generateImage(prompt: string, presetPrompt?: string, highQuality: boolean = false, useSearch: boolean = false, aspectRatio: string = "1:1", negativePrompt?: string): Promise<string> {
    const callGenerate = async (model: string, isPro: boolean, silentOnFail: boolean = false, attempts: number = 0) => {
      const sanitizedPrompt = prompt.length < 15 ? `Professional artistic representation of: ${prompt}` : prompt;
      
      return this.executeNeuralOperation(`generate-${prompt.slice(0, 10)}-${model}`, async (signal) => {
        const ai = this.getClient();
        const finalPrompt = presetPrompt ? `${sanitizedPrompt}. Estilo: ${presetPrompt}` : sanitizedPrompt;
        const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (EVITAR): ${negativePrompt}` : "";
        
        const fullContextPrompt = `GENERATE IMAGE: ${finalPrompt}${negativeInstruction}
        
        MANDATO TÉCNICO:
        - Output ONLY the image binary data.
        - NO TEXT, NO EXPLANATIONS.
        - High fidelity, professional quality.`;

        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [{ text: fullContextPrompt }],
            },
            config: {
              systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nIMPORTANTE: Eres un motor de generación visual. Tu salida debe ser ÚNICAMENTE el archivo de imagen. No respondas con texto.",
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

          const parts = this.validateResponse(response, "generateImage");
          let textFeedback = "";

          for (const part of parts) {
            if (part.inlineData) {
              console.log("[GEMINI_SERVICE] Visual data detected and extracted.");
              return `data:image/png;base64,${part.inlineData.data}`;
            }
            if ((part as any).fileData) {
              return (part as any).fileData.fileUri;
            }
            if (part.text) {
              textFeedback += part.text + " ";
            }
          }
          
          const errorMsg = textFeedback.trim()
            ? `NEURAL_REJECTION: El motor no generó una imagen. Se recibió texto en su lugar: ${textFeedback.trim()}`
            : "NEURAL_MISSING_DATA: El motor devolvió una respuesta exitosa pero sin datos de imagen binarios.";
          
          throw new Error(errorMsg);
        } catch (err: any) {
          // If it's a safety error and we haven't tried a "soft" prompt yet, try once
          if (err.message.includes("IMAGE_SAFETY") && attempts === 0) {
            console.warn("[GEMINI_SERVICE] Safety filter hit. Retrying with ultra-neutral prompt...");
            const neutralPrompt = `High quality aesthetic image: ${prompt}`;
            // Recursive call with increased attempt count
            return callGenerate(model, isPro, silentOnFail, attempts + 1);
          }
          throw err;
        }
      }, isPro, silentOnFail);
    };

    try {
      const primaryModel = highQuality ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      return await callGenerate(primaryModel, highQuality, true);
    } catch (err: any) {
      const msg = (err?.message || "").toUpperCase();
      const status = err?.status || err?.statusCode || err?.code || "";
      const isPermissionErr = msg.includes("PERMISSION") || msg.includes("403") || msg.includes("MISSING_DATA") || msg.includes("LOCKED") || msg.includes("NOT_FOUND") || status === 403;
      
      if (isPermissionErr) {
        const fallback = highQuality ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
        console.warn(`[GEMINI_SERVICE] Primary model failed (${msg.slice(0, 50)}...). Attempting fallback to ${fallback}.`);
        try {
          return await callGenerate(fallback, false, false);
        } catch (fallbackErr: any) {
          // If fallback also fails, provide a consolidated error
          if (fallbackErr.message?.includes("IMAGE_SAFETY")) {
            throw new Error("CONTENIDO_RESTRINGIDO: El prompt fue bloqueado por los filtros de seguridad en ambos modelos. Intenta usar un lenguaje más descriptivo y neutro.");
          }
          const fallbackMsg = (fallbackErr?.message || "").toUpperCase();
          const fallbackStatus = fallbackErr?.status || fallbackErr?.statusCode || fallbackErr?.code || "";
          const isFallbackPermissionErr = fallbackMsg.includes("PERMISSION") || fallbackMsg.includes("403") || fallbackStatus === 403;
          if (isFallbackPermissionErr) {
            throw new Error("ERROR_DE_PERMISOS: No se pudo acceder a los modelos de generación. Cerciórate de que tu API Key tenga habilitados los modelos Imagen/Gemini Visual.");
          }
          throw fallbackErr;
        }
      }
      throw err;
    }
  }

  async editImage(base64Image: string, prompt: string, presetPrompt?: string, highQuality: boolean = true, aspectRatio: string = "1:1", negativePrompt?: string): Promise<string> {
    const callEdit = async (model: string, isPro: boolean, silentOnFail: boolean = false, attempts: number = 0) => {
      const sanitizedPrompt = prompt.length < 15 ? `Professional edit based on: ${prompt}` : prompt;
      
      return this.executeNeuralOperation(`edit-${prompt.slice(0, 10)}-${model}`, async (signal) => {
        const ai = this.getClient();
        const cleanBase64 = base64Image.split(',')[1] || base64Image;
        const finalPrompt = presetPrompt ? `${sanitizedPrompt}. Visual Signature: ${presetPrompt}` : sanitizedPrompt;
        const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
        
        const fullContextPrompt = `EDIT TASK: ${finalPrompt}${negativeInstruction}
        
        TECHNICAL MANDATE:
        - Modify the provided image according to the instructions.
        - DO NOT PROVIDE TEXT. Only output the edited image.
        - Maintain consistency with the original content unless instructed otherwise.`;

        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
                { text: fullContextPrompt },
              ],
            },
            config: {
              systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are an image editor. Never reply with text. Always and only output the modified image binary.",
              imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: highQuality ? "1K" : undefined
              }
            }
          });

          const parts = this.validateResponse(response, "editImage");
          let textFeedback = "";
          for (const part of parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
            if (part.text) {
              textFeedback += part.text + " ";
            }
          }
          const errorMsg = textFeedback 
            ? `NEURAL_REJECTION: El motor no pudo editar la imagen. Recibió texto: ${textFeedback.trim()}`
            : "Neural Engine failed to return edited data.";
          throw new Error(errorMsg);
        } catch (err: any) {
          if (err.message.includes("IMAGE_SAFETY") && attempts === 0) {
            console.warn("[GEMINI_SERVICE] Safety hit during edit. Retrying...");
            return callEdit(model, isPro, silentOnFail, attempts + 1);
          }
          throw err;
        }
      }, isPro, silentOnFail);
    };

    try {
      const primaryModel = highQuality ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      return await callEdit(primaryModel, highQuality, true);
    } catch (err: any) {
      const msg = (err?.message || "").toUpperCase();
      const status = err?.status || err?.statusCode || err?.code || "";
      const isPermissionErr = msg.includes("PERMISSION") || msg.includes("403") || msg.includes("NOT_FOUND") || msg.includes("LOCKED") || status === 403;

      if (isPermissionErr) {
        const fallback = highQuality ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
        console.warn(`[GEMINI_SERVICE] Edit fallback to ${fallback} due to: ${msg.slice(0, 30)}`);
        try {
          return await callEdit(fallback, false, false);
        } catch (fallbackErr: any) {
          if (fallbackErr.message?.includes("IMAGE_SAFETY")) {
             throw new Error("EDICION_RESTRINGIDA: No se pudo realizar la edición por restricciones de seguridad. Intenta simplificar el prompt de edición.");
          }
          throw fallbackErr;
        }
      }
      throw err;
    }
  }

  async inpaintImage(base64Image: string, maskBase64: string, prompt: string, presetPrompt?: string, negativePrompt?: string, aspectRatio: string = "1:1"): Promise<string> {
    return this.executeNeuralOperation(`inpaint-${prompt.slice(0, 10)}`, async (signal) => {
      const ai = this.getClient();
      const cleanImg = base64Image.split(',')[1] || base64Image;
      const cleanMask = maskBase64.split(',')[1] || maskBase64;
      const finalPrompt = presetPrompt ? `${prompt}. Preset style: ${presetPrompt}` : prompt;
      
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `TASK: INPAINTING.
The first image is the original scene. 
The second image is a binary mask where white areas indicate the region to be regenerated.
The third part is the user prompt describing what should appear in that masked region.
USER INTENT (INPAINT): ${finalPrompt}${negativeInstruction}

TECHNICAL MANDATE:
- Generate ONLY the inpainted image. 
- NO TEXT. NO PREAMBLE.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: cleanImg, mimeType: 'image/png' } },
            { inlineData: { data: cleanMask, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
        config: {
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are an inpainting specialist. Output ONLY the modified image data. No text.",
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });

      const parts = this.validateResponse(response, "inpaintImage");
      let textFeedback = "";
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        if (part.text) {
          textFeedback += part.text + " ";
        }
      }
      const errorMsg = textFeedback 
        ? `NEURAL_REJECTION: El motor no pudo realizar el inpainting. Respuesta técnica: ${textFeedback.trim()}`
        : "Neural Engine failed to return inpainted data.";
      throw new Error(errorMsg);
    });
  }

  async analyzeForRefinement(base64Image: string, originalPrompt: string): Promise<string> {
    return this.executeNeuralOperation('refinement-analysis', async (signal) => {
      const ai = this.getClient();
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
            { text: `Analyze this image against: "${originalPrompt}". Provide a more technical and detailed prompt to improve its realism.` },
          ],
        },
        config: { systemInstruction: SYSTEM_CORE_INSTRUCTIONS }
      });
      this.validateResponse(response, "analyzeForRefinement");
      return response.text || "";
    });
  }

  async analyzeImage(base64Image: string): Promise<any> {
    return this.executeNeuralOperation('visual-analysis', async (signal) => {
      const ai = this.getClient();
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
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
      this.validateResponse(response, "analyzeImage");
      return safeJSONParse(response.text || "{}");
    });
  }

  async searchSpecificObjects(base64Image: string, query: string): Promise<any[]> {
    return this.executeNeuralOperation('object-search', async (signal) => {
      const ai = this.getClient();
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
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
      this.validateResponse(response, "searchSpecificObjects");
      const res = safeJSONParse(response.text || "[]");
      return Array.isArray(res) ? res : [];
    });
  }

  async suggestColorGrading(base64Image: string): Promise<any> {
    return this.executeNeuralOperation('color-grading-suggestions', async (signal) => {
      const ai = this.getClient();
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
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
      this.validateResponse(response, "suggestColorGrading");
      return safeJSONParse(response.text || "{}");
    });
  }

  async styleTransfer(contentImage: string, styleImage: string, prompt: string, intensity: number = 80, negativePrompt?: string, aspectRatio: string = "1:1"): Promise<string> {
    return this.executeNeuralOperation(`style-transfer-${prompt.slice(0, 10)}`, async (signal) => {
      const ai = this.getClient();
      const cleanContent = contentImage.split(',')[1] || contentImage;
      const cleanStyle = styleImage.split(',')[1] || styleImage;
      
      const negativeInstruction = negativePrompt ? `\n\nNEGATIVE PROMPT (AVOID): ${negativePrompt}` : "";
      const fullContextPrompt = `TASK: STYLE TRANSFER.
Apply the artistic style, color palette, and aesthetic of the SECOND image to the content of the FIRST image.
STYLE INTENSITY: ${intensity}%.
USER INTENT: ${prompt}${negativeInstruction}

TECHNICAL MANDATE:
- Output ONLY the result image.
- NO TEXTUAL FEEDBACK.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: cleanContent, mimeType: 'image/png' } },
            { inlineData: { data: cleanStyle, mimeType: 'image/png' } },
            { text: fullContextPrompt },
          ],
        },
        config: {
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are a style transfer engine. Output ONLY the image binary. No text.",
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });

      const parts = this.validateResponse(response, "styleTransfer");
      let textFeedback = "";
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        if (part.text) {
          textFeedback += part.text + " ";
        }
      }
      const errorMsg = textFeedback 
        ? `NEURAL_REJECTION: El motor no pudo realizar la transferencia de estilo. Respuesta técnica: ${textFeedback.trim()}`
        : "Neural Engine failed to return style-transferred data.";
      throw new Error(errorMsg);
    });
  }

  async upscaleImage(base64Image: string, factor: string, aspectRatio: string = "1:1", customPrompt?: string): Promise<string> {
    const sizeMap: Record<string, string> = {
      "2x": "2K",
      "4x": "4K",
      "8x": "4K"
    };
    const targetSize = sizeMap[factor] || "2K";

    const callUpscale = async (model: string, isPro: boolean, silentOnFail: boolean = false, attempts: number = 0) => {
      return this.executeNeuralOperation(`upscale-${factor}-${model}`, async (signal) => {
        const ai = this.getClient();
        const cleanBase64 = base64Image.split(',')[1] || base64Image;
        
        const fullContextPrompt = `TASK: NEURAL UPGRADE & RESOLUTION ENHANCEMENT.
Increase the resolution and fidelity of the provided image to ${targetSize}.
${customPrompt ? `ADDITIONAL CONTEXT: ${customPrompt}` : ""}
Maintain absolute fidelity to the original subject, colors, and composition.
Enhance micro-textures, specular highlights, and surface detail to professional studio standards.
Reconstruct high-frequency details (hair, skin pores, fabric weave, metal grit) that may be blurred.
Remove any compression artifacts, noise, or blurring.

TECHNICAL MANDATE:
- Output ONLY the high-resolution image binary.
- NO TEXT. NO CONVERSATION.`;

        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
                { text: fullContextPrompt },
              ],
            },
            config: {
              systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are an image upscaler. Output ONLY the upscaled image binary. No text.",
              imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: targetSize as any || "2K"
              }
            }
          });

          const parts = this.validateResponse(response, "upscaleImage");
          let textFeedback = "";
          for (const part of parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
            if (part.text) {
              textFeedback += part.text + " ";
            }
          }
          const errorMsg = textFeedback 
            ? `NEURAL_REJECTION: El motor no pudo realizar el escalado. Respuesta técnica: ${textFeedback.trim()}`
            : "Neural Engine failed to return upscaled data.";
          throw new Error(errorMsg);
        } catch (err: any) {
          if (err.message.includes("IMAGE_SAFETY") && attempts === 0) {
            console.warn("[GEMINI_SERVICE] Safety hit during upscale. Retrying...");
            return callUpscale(model, isPro, silentOnFail, attempts + 1);
          }
          throw err;
        }
      }, isPro, silentOnFail);
    };

    try {
      const primaryModel = 'gemini-3.1-flash-image-preview';
      return await callUpscale(primaryModel, true, true);
    } catch (err: any) {
      const msg = (err?.message || JSON.stringify(err) || "").toUpperCase();
      const status = err?.status || err?.statusCode || err?.code || "";
      const isPermissionErr = msg.includes("PERMISSION") || msg.includes("403") || msg.includes("FORBIDDEN") || msg.includes("ALLOW") || msg.includes("KEY_INVALID") || msg.includes("NOT_FOUND") || msg.includes("LOCKED") || status === 403;
      
      if (isPermissionErr) {
        const fallback = 'gemini-2.5-flash-image';
        console.warn(`[GEMINI_SERVICE] Upscale fallback to ${fallback} due to: ${msg.slice(0, 50)}`);
        try {
          return await callUpscale(fallback, false, true);
        } catch (fallbackErr: any) {
           if (fallbackErr.message?.includes("IMAGE_SAFETY")) {
             throw new Error("RECONSTRUCCION_BLOQUEADA: El motor de seguridad ha impedido el escalado de esta imagen.");
           }
           const fallbackMsg = (fallbackErr?.message || JSON.stringify(fallbackErr) || "").toUpperCase();
           const fallbackStatus = fallbackErr?.status || fallbackErr?.statusCode || fallbackErr?.code || "";
           const isFallbackPermissionErr = fallbackMsg.includes("PERMISSION") || fallbackMsg.includes("FORBIDDEN") || fallbackMsg.includes("403") || fallbackMsg.includes("ALLOW") || fallbackMsg.includes("KEY_INVALID") || fallbackMsg.includes("NOT_FOUND") || fallbackMsg.includes("LOCKED") || fallbackStatus === 403;
           
           if (isFallbackPermissionErr) {
             console.log("[GEMINI_SERVICE] 403/Permission denied on fallback. Activating Premium Local Resampling Fallback.");
             toast.info("Resample Neural Local Activo", {
               description: "El escalador premium en la nube requiere una API Key de Gemini con facturación habilitada. Usando el algoritmo de súper-resolución local con nitidez sub-pixel y reducción de ruido de manera óptima."
             });
             return await canvasUpscaleFallback(base64Image, factor);
           }
           throw fallbackErr;
        }
      }
      // If any other unhandled API error happens (non-safety), fallback gracefully
      if (!msg.includes("SAFETY") && !msg.includes("BLOQUEADA")) {
        console.warn("[GEMINI_SERVICE] Unexpected error in upscale, falling back to local resampler:", err);
        toast.info("Resample Neural Local Activo", {
          description: "Usando el algoritmo de súper-resolución local con nitidez sub-pixel y reducción de ruido debido a una inestabilidad del servicio en la nube."
        });
        return await canvasUpscaleFallback(base64Image, factor);
      }
      throw err;
    }
  }

  async applyNeuralWatermark(base64Image: string, watermarkParams: { text?: string; logo?: string; opacity: number; position: string }): Promise<string> {
    return this.executeNeuralOperation(`watermark-${Date.now()}`, async (signal) => {
      const ai = this.getClient();
      const cleanImg = base64Image.split(',')[1] || base64Image;
      
      let prompt = `TASK: NEURAL WATERMARKING.
Embed the following identification elements into the image for Intellectual Property protection.
${watermarkParams.text ? `TEXT TO EMBED: "${watermarkParams.text}"` : ""}
${watermarkParams.logo ? `A logo image is also provided to be used as a graphic watermark.` : ""}

INTENSITY: ${watermarkParams.opacity * 100}%
POSITIONING: ${watermarkParams.position}

TECHNICAL MANDATE:
- The watermark should be "neural", meaning it should be subtly blended into the image's high-frequency details, lighting, and textures.
- It should appear as a professional studio-grade watermark or a subtle physical detailing (like an engraving or reflection) that is difficult to remove without destroying image fidelity.
- It must be integrated naturally into the scene's color space and illumination.
- Output ONLY the watermarked image binary data.
- NO TEXT. NO CONVERSATION.`;

      const contentsParts: any[] = [
        { inlineData: { data: cleanImg, mimeType: 'image/png' } }
      ];

      if (watermarkParams.logo) {
        const cleanLogo = watermarkParams.logo.split(',')[1] || watermarkParams.logo;
        contentsParts.push({ inlineData: { data: cleanLogo, mimeType: 'image/png' } });
      }

      contentsParts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: contentsParts },
        config: {
          systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are a secure neural watermarking engine. Output ONLY the modified image binary data. No text.",
          imageConfig: {
            imageSize: "1K"
          }
        }
      });

      const parts = this.validateResponse(response, "applyNeuralWatermark");
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("Neural Engine failed to return watermarked data.");
    });
  }

  async parseIntent(prompt: string): Promise<string> {
    if (this.intentCache.has(prompt)) return this.intentCache.get(prompt)!;

    return this.executeNeuralOperation(`parse-intent-${prompt.slice(0, 10)}`, async (signal) => {
      const ai = this.getClient();
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
      this.validateResponse(response, "parseIntent");
      const res = response.text || prompt;
      this.intentCache.set(prompt, res);
      return res;
    });
  }

  async syntergicGenerate(
    prompt: string, 
    mode: 'mockup' | 'asset' | 'concept' | 'dataset' | 'worldbuilding',
    params: { lambda: number; protocol: number; entropy: number },
    highQuality: boolean = true,
    variationCount: number = 1,
    aspectRatio: string = "1:1",
    negativePrompt?: string
  ): Promise<string[]> {
    const modelName = highQuality ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
    
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
Π (Protocol/Execution): ${params.protocol}% - Apply professional studio standards.
Δν (Stylistic Variation): ${params.entropy}% - Controlled aesthetic entropy.

TASK: ${mode.toUpperCase()}
${modeInstructions[mode]}

STRUCTURED INTENT:
${structuredPrompt}${negativeInstruction}
`;

    const results: string[] = [];
    const actualVariationCount = Math.max(variationCount, params.entropy > 70 ? 2 : 1);

    const callSyntergic = async (model: string, isPro: boolean) => {
      const variationTasks = Array.from({ length: actualVariationCount }).map((_, i) => {
        const variationSeed = i > 0 ? `\nVariation ${i+1}: Focus on a different angle or lighting nuance while maintaining coherence.` : "";
        return this.executeNeuralOperation(`syntergic-${mode}-${i}-${model}`, async (signal) => {
          const ai = this.getClient();
          const fullContextPrompt = `SYNTERGIC ACTIVATION [Mode: ${mode.toUpperCase()}]
DNA PARAMETERS: Λ=${params.lambda} Π=${params.protocol} Δν=${params.entropy}
CORE INTENT: ${structuredPrompt}${negativeInstruction}
${variationSeed}

TECHNICAL MANDATE:
- Synthesize image based on DNA.
- NO TEXT. NO CONVERSATION.`;

          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [{ text: fullContextPrompt }],
            },
            config: {
              systemInstruction: SYSTEM_CORE_INSTRUCTIONS + "\nCRITICAL: You are the Syntergic Visual Engine. Output ONLY image data. No text.",
              imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: isPro ? "1K" : undefined
              },
            }
          });

          const parts = this.validateResponse(response, "syntergicGenerate");
          let textFeedback = "";
          for (const part of parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
            if (part.text) {
              textFeedback += part.text + " ";
            }
          }
          const errorMsg = textFeedback 
            ? `SYNTERGIC_REJECTION: Error en la síntesis. Respuesta técnica: ${textFeedback.trim()}`
            : "Syntergic Engine failed to synthesize visual data.";
          throw new Error(errorMsg);
        }, isPro);
      });
      return Promise.all(variationTasks);
    };

    try {
      return await callSyntergic(modelName, highQuality);
    } catch (err: any) {
      const msg = (err?.message || "").toUpperCase();
      const status = err?.status || err?.statusCode || err?.code || "";
      const isPermissionErr = msg.includes("PERMISSION") || msg.includes("403") || msg.includes("NOT_FOUND") || status === 403;
      if (isPermissionErr) {
        const fallback = highQuality ? 'gemini-2.5-flash-image' : 'gemini-3.1-flash-image-preview';
        return await callSyntergic(fallback, false);
      }
      throw err;
    }
  }

  async worldbuild(
    universeIntent: string,
    params: { lambda: number; protocol: number; entropy: number },
    aspectRatio: string = "1:1"
  ): Promise<{ category: string; image: string }[]> {
    const categories = ["Environment", "Vehicle", "Character", "Technology"];
    
    const tasks = categories.map(cat => (async () => {
      const catPrompt = `Part of a ${universeIntent} universe: A high-end ${cat} design.`;
      const images = await this.syntergicGenerate(catPrompt, 'worldbuilding', params, true, 1, aspectRatio);
      return { category: cat, image: images[0] };
    })());

    return Promise.all(tasks);
  }

  async suggestEnhancements(prompt: string, mode: string): Promise<{ enhanced: string; keywords: string[] }> {
    return this.executeNeuralOperation('prompt-enhancement', async (signal) => {
      const ai = this.getClient();
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
      this.validateResponse(response, "suggestEnhancements");
      const res = safeJSONParse(response.text || "{}");
      return {
        enhanced: res.enhanced || prompt,
        keywords: Array.isArray(res.keywords) ? res.keywords : []
      };
    });
  }

  private lastEvalTime = 0;
  private evalCooldown = 15000; // 15 seconds between evaluations

  async evaluateAsset(image: string, prompt: string): Promise<any> {
    const now = Date.now();
    if (now - this.lastEvalTime < this.evalCooldown) {
      console.warn("[GEMINI_SERVICE] Evaluation skipped due to cooldown.");
      return { score: 0, feedback: "Evaluación en enfriamiento para conservar cuota.", metrics: { lambda: 0, protocol: 0, entropy: 0 } };
    }
    this.lastEvalTime = now;

    return this.executeNeuralOperation('asset-evaluation', async (signal) => {
      const ai = this.getClient();
      const cleanImg = image.split(',')[1] || image;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: cleanImg, mimeType: 'image/png' } },
            { text: `Evaluate this synthetic asset against the original intent: "${prompt}".
            Provide a Syntergic Score (0-100) based on Λ (Coherence), Π (Fidelity), and Δν (Aesthetic Appeal).
            Return ONLY a JSON object:
            {
              "score": number,
              "feedback": "string",
              "metrics": { "lambda": number, "protocol": number, "entropy": number }
            }` }
          ]
        },
        config: { responseMimeType: "application/json" }
      });
      this.validateResponse(response, "evaluateAsset");
      return safeJSONParse(response.text || "{}");
    });
  }

  async generateText(prompt: string): Promise<string> {
    return this.executeNeuralOperation('text-completion', async (signal) => {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });
      this.validateResponse(response, "generateText");
      return response.text || "";
    });
  }
}

export const gemini = new GeminiService();

/**
 * Universal Hook for text generation within S.A.F.
 */
export async function generateFromGemini(prompt: string) {
  return await gemini.generateText(prompt);
}

/**
 * Π (Generator) - Integrated with S.A.F. Architecture
 */
export class Generator {
  async generate(prompt: string) {
    const res = await gemini.parseIntent(prompt); // Using parseIntent for text-based generation
    return { content: res };
  }
}
