
export type AgentType = "fast" | "smart" | "judge" | "metaJudge";

export class CostTracker {
  apiCalls = 0;
  tokens = 0;
  internalSteps = 0;
  latencyMs = 0;

  // Configurable weights
  cognitiveWeight = 0.6;
  tokenWeight = 0.0002;
  latencyWeight = 0.0005;

  agentCost: Record<AgentType, number> = {
    fast: 1,
    smart: 3,
    judge: 2,
    metaJudge: 4
  };

  lambdaHistory: number[] = [];
  limit = 18; // Global cost limit

  addApiCall(tokens = 0) {
    this.apiCalls += 1;
    this.tokens += tokens;
  }

  addStep(agent: AgentType, latency = 0) {
    this.internalSteps += this.agentCost[agent];
    this.latencyMs += latency;
  }

  pushLambda(lambda: number) {
    this.lambdaHistory.push(lambda);
  }

  getTotalCost() {
    const apiCost = this.apiCalls + (this.tokens * this.tokenWeight);
    const cognitiveCost = this.cognitiveWeight * this.internalSteps;
    const latencyCost = this.latencyMs * this.latencyWeight;

    return apiCost + cognitiveCost + latencyCost;
  }

  getPrevLambda() {
    if (this.lambdaHistory.length < 2) return 0;
    return this.lambdaHistory[this.lambdaHistory.length - 2];
  }

  getMarginalGain(curr: number) {
    return curr - this.getPrevLambda();
  }

  getEfficiency(curr: number) {
    return curr / (this.getTotalCost() + 1e-6);
  }
}
