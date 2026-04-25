
export type DecisionMode = "fast" | "explore" | "refine" | "conserve";

export class MetaDecisionEngine {
  chooseMode(context: { predictedLambda: number; cost: number; budgetLimit: number }): DecisionMode {
    const { predictedLambda, cost, budgetLimit } = context;
    const remaining = budgetLimit - cost;

    // 1) High confidence = Efficiency mode
    if (predictedLambda > 0.88) {
      return "fast";
    }

    // 2) Plenty of budget = Exploration mode
    if (remaining > 12) {
      return "explore";
    }

    // 3) Partial success/Medium budget = Refinement
    if (remaining > 6) {
      return "refine";
    }

    // 4) Late stage/Low budget = Conservation
    return "conserve";
  }
}
