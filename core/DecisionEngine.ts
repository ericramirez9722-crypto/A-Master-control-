
import { CostTracker } from "./CostTracker";

export interface SystemState {
  attempts: number;
  bestOutput: any;
  bestLambda: number;
}

export class DecisionEngine {
  lambdaTarget = 0.92;
  maxAttempts = 3;

  // Thinking economy
  minEfficiency = 0.04;      // Λ / cost minimum acceptable
  minMarginalGain = 0.02;    // Lambda gain minimum per iteration
  costLimit = 18;            // Total budget

  shouldContinue(state: SystemState, evalResult: { lambda: number }, cost: CostTracker) {
    const lambda = evalResult.lambda;

    // 1) Sufficient quality
    if (lambda >= this.lambdaTarget) return false;

    // 2) Hard limits
    if (state.attempts >= this.maxAttempts) return false;
    if (cost.getTotalCost() >= this.costLimit) return false;

    // 3) Marginal gain (is it worth thinking more?)
    if (state.attempts >= 1) {
      const gain = cost.getMarginalGain(lambda);
      if (gain < this.minMarginalGain) {
        console.log(`[C-ROI] Low marginal gain: ${gain.toFixed(4)}. Stopping.`);
        return false;
      }
    }

    // 4) Global efficiency
    const eff = cost.getEfficiency(lambda);
    if (eff < this.minEfficiency) {
      console.log(`[C-ROI] Low efficiency: ${eff.toFixed(4)}. Stopping.`);
      return false;
    }

    return true;
  }

  updateState(state: SystemState, output: any, evalResult: { lambda: number }, cost: CostTracker): SystemState {
    const lambda = evalResult.lambda;
    cost.pushLambda(lambda);

    if (lambda > state.bestLambda) {
      return {
        attempts: state.attempts + 1,
        bestOutput: output,
        bestLambda: lambda
      };
    }

    return { ...state, attempts: state.attempts + 1 };
  }
}
