
import { Evaluator } from "./Evaluator";
import { MultiGenerator } from "./MultiGenerator";
import { Adjuster } from "./Adjuster";
import { DecisionEngine, SystemState } from "./DecisionEngine";
import { CostTracker } from "./CostTracker";
import { MemoryStore } from "./MemoryStore";
import { GeneticEngine } from "./GeneticEngine";
import { AgentOrchestrator } from "./AgentOrchestrator";
import { LambdaPredictor } from "./LambdaPredictor";
import { MetaDecisionEngine, DecisionMode } from "./MetaDecisionEngine";
import { PolicyLearner, Policy } from "./PolicyLearner";
import { IntuitionEngine, Intuition } from "./IntuitionEngine";

export class NeuralSystem {
  multiGen = new MultiGenerator();
  evaluator = new Evaluator();
  adjuster = new Adjuster();
  decision = new DecisionEngine();
  memory = new MemoryStore();
  
  // Advanced Layers
  genetic = new GeneticEngine();
  agents = new AgentOrchestrator();
  predictor = new LambdaPredictor();
  meta = new MetaDecisionEngine();
  learner = new PolicyLearner();
  intuition = new IntuitionEngine(this.memory);

  computeReward(lambda: number, cost: number) {
    // Reward = Quality - Weighted Cost Penalty
    return lambda - (0.05 * cost);
  }

  async run(input: string, onUpdate?: (data: any) => void, providedIntuition?: Intuition) {
    const cost = new CostTracker();
    
    // 0) Intuition Layer: Decide if execution is worth the effort
    const intuitionResult = providedIntuition || await this.intuition.infer(input);
    
    onUpdate?.({ 
      type: "neural:intuition", 
      payload: { 
        predictedLambda: intuitionResult.predictedLambda,
        confidence: intuitionResult.confidence,
        predictedCost: intuitionResult.predictedCost,
        roi: intuitionResult.predictedROI
      } 
    });

    // 0.1) Gate: Avoid low-ROI operations if confidence is high
    if (intuitionResult.predictedROI < 0.02 && intuitionResult.confidence > 0.7) {
      console.log(`[NEURAL_SYSTEM] Skipping execution: Predict ROI (${intuitionResult.predictedROI}) is too low.`);
      return "Operation skipped due to low expected ROI. Refine prompt for better results.";
    }

    let policy: Policy = intuitionResult.bestPolicy;

    // Exploration vs Exploitation (15% chance to try something random)
    if (Math.random() < 0.15) {
      console.log(`[NEURAL_SYSTEM] Strategy exploration triggered.`);
      policy = { 
        variants: Math.floor(Math.random() * 3) + 1, 
        judges: Math.floor(Math.random() * 4) + 1, 
        strategy: "explore" 
      };
    }

    let population = [input];
    let state: SystemState = {
      attempts: 0,
      bestOutput: null,
      bestLambda: 0
    };

    onUpdate?.({ type: "neural:progress", payload: { attempt: 0, currentLambda: 0, totalCost: 0 } });

    for (let gen = 0; gen < this.decision.maxAttempts; gen++) {
      const currentPrompt = population[0];

      // 1) 🔮 Integrated Prediction
      const predicted = this.predictor.predict(currentPrompt);
      const mode: DecisionMode = this.meta.chooseMode({
        predictedLambda: Math.max(predicted, state.bestLambda),
        cost: cost.getTotalCost(),
        budgetLimit: this.decision.costLimit
      });

      console.log(`[NEURAL_SYSTEM] Gen ${gen} | Predicted Λ: ${predicted.toFixed(2)} | Best Λ: ${state.bestLambda.toFixed(2)} | Mode: ${mode}`);

      if (mode === "conserve" && state.bestLambda > 0.8) break;

      // 2) 🤖 Multi-Agent Generation
      const agentPrompts = this.agents.buildPrompts(currentPrompt);
      const activePrompts = mode === "fast" ? [agentPrompts[0]] : agentPrompts.slice(0, policy.variants + 1);

      const outputs = await Promise.all(
        activePrompts.map(p => this.multiGen.generateVariants(p.prompt, 1, cost).then(v => v[0]))
      );

      // 3) Λ Consensus
      const currentEvaluations = await Promise.all(
        outputs.map(o => this.evaluator.evaluate(o, input, cost))
      );

      const lambdas = currentEvaluations.map(e => e.lambda);
      const bestIdx = lambdas.indexOf(Math.max(...lambdas));
      const topEval = currentEvaluations[bestIdx];
      const topOutput = outputs[bestIdx];

      // 4) State Update
      state = this.decision.updateState(state, topOutput, topEval, cost);

      onUpdate?.({ 
        type: "neural:progress", 
        payload: { 
          attempt: state.attempts, 
          currentLambda: state.bestLambda, 
          totalCost: cost.getTotalCost(),
          mode,
          prediction: predicted,
          generation: gen,
          log: topEval.feedback ? `Consensus: ${topEval.feedback.slice(0, 50)}...` : `λ: ${topEval.lambda.toFixed(2)} | gen: ${gen}`
        } 
      });

      if (!this.decision.shouldContinue(state, topEval, cost)) break;

      // 5) 🧬 Genetic Evolution
      population = this.genetic.evolve(activePrompts.map(p => p.prompt), lambdas);
      population[2] = this.adjuster.adjust(population[2], topEval);
    }

    // 6) Post-Execution: Learning
    const finalReward = this.computeReward(state.bestLambda, cost.getTotalCost());
    this.learner.record(policy, finalReward);

    await this.memory.store({
      input,
      output: state.bestOutput,
      lambda: state.bestLambda,
      cost: cost.getTotalCost(),
      strategy: policy,
      timestamp: Date.now()
    });

    return state.bestOutput;
  }
}
