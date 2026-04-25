
import { generateFromGemini } from "../services/geminiService";
import { CostTracker } from "./CostTracker";

export class MultiGenerator {
  async generateVariants(prompt: string, count: number, cost: CostTracker) {
    const t0 = Date.now();

    const variants = await Promise.all(
      Array.from({ length: count }).map(async (_, i) => {
        const start = Date.now();
        const approach = i === 0 ? "Standard approach" : i === 1 ? "Creative/Alternative approach" : "Highly technical/Edge-case approach";
        const result = await generateFromGemini(
          `${prompt}\n\n[STRATEGY: ${approach}]\nNote: Provide a unique variation of the response.`
        );
        cost.addApiCall();
        cost.addStep("smart", Date.now() - start);
        return { content: result };
      })
    );

    cost.addStep("fast", Date.now() - t0); // Overall coordination cost
    return variants;
  }
}
