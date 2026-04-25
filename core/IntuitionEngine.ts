
import { MemoryStore } from "./MemoryStore";
import { Policy } from "./PolicyLearner";

export type Intuition = {
  predictedLambda: number;
  predictedCost: number;
  predictedROI: number;
  bestPolicy: Policy;
  confidence: number;
};

export class IntuitionEngine {
  constructor(private memory: MemoryStore) {}

  async infer(input: string): Promise<Intuition> {
    const sims = await this.memory.findSimilar(input, 5);
    
    // Quick heuristics for base intuition
    const hasConstraints = /must|exact|json|steps|strictly|required/i.test(input);
    const complexity = input.split(" ").length / 50;

    if (sims.length === 0) {
      let baseLambda = 0.6;
      let baseCost = 8;
      
      if (hasConstraints) baseLambda += 0.05;
      baseCost += complexity * 2;

      return {
        predictedLambda: Math.min(0.9, baseLambda),
        predictedCost: baseCost,
        predictedROI: baseLambda / baseCost,
        bestPolicy: { variants: 2, judges: 3, strategy: "focused" },
        confidence: 0.3
      };
    }

    // Weighted intuition by similarity
    let wSum = 0, L = 0, C = 0;
    const policyVotes = new Map<string, number>();

    for (const s of sims) {
      const w = Math.max(s.sim, 1e-3);
      wSum += w;
      L += w * s.lambda;
      C += w * s.cost;

      const key = JSON.stringify(s.strategy);
      policyVotes.set(key, (policyVotes.get(key) || 0) + w);
    }

    let predictedLambda = L / wSum;
    let predictedCost = C / wSum;

    // Apply complexity adjustments even to experience-based intuition
    if (hasConstraints) predictedLambda += 0.02;
    predictedCost += complexity * 0.5;

    const predictedROI = predictedLambda / (predictedCost + 1e-6);

    // Winner-takes-all best policy based on weighted similarity votes
    let bestKey = "";
    let bestW = -Infinity;
    for (const [k, w] of policyVotes) {
      if (w > bestW) {
        bestW = w;
        bestKey = k;
      }
    }

    const bestPolicy: Policy = bestKey
      ? JSON.parse(bestKey)
      : { variants: 2, judges: 3, strategy: "focused" };

    const confidence = Math.min(1, wSum / sims.length);

    return { 
      predictedLambda: Math.min(0.98, predictedLambda), 
      predictedCost, 
      predictedROI, 
      bestPolicy, 
      confidence 
    };
  }
}
