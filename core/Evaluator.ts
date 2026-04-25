
import { generateFromGemini } from "../services/geminiService";
import { CostTracker } from "./CostTracker";

export interface JudgeResult {
  type: string;
  score: number;
  reason: string;
}

export interface EvaluationResult {
  lambda: number;
  judges: JudgeResult[];
  feedback: string;
}

export class Evaluator {
  async evaluate(output: any, prompt: string, cost: CostTracker): Promise<EvaluationResult> {
    const start = Date.now();
    const judgeTypes = ["relevance", "coherence", "quality", "strict"];
    
    // Π (Parallel Execution) - Run all judges simultaneously
    const judgeTasks = judgeTypes.map(type => this.runJudge(type, output, prompt, cost));
    const judges = await Promise.all(judgeTasks);

    cost.addStep("metaJudge", Date.now() - start);

    return this.aggregate(judges);
  }

  private async runJudge(type: string, output: any, prompt: string, cost: CostTracker): Promise<JudgeResult> {
    const t0 = Date.now();
    const judgePrompt = this.buildPrompt(type, output, prompt);
    
    try {
      const response = await generateFromGemini(judgePrompt);
      cost.addApiCall();
      cost.addStep("judge", Date.now() - t0);
      return this.parse(response, type);
    } catch (err) {
      console.error(`[JUDGE_CRITICAL_FAIL] ${type}:`, err);
      return { type, score: 0.1, reason: "LLM Failure" };
    }
  }

  private buildPrompt(type: string, output: any, prompt: string) {
    return `
      You are a specialized ${type.toUpperCase()} evaluator.
      
      CRITERIA: Evaluate the ${type} of the generated output relative to the original prompt.
      
      ORIGINAL PROMPT:
      "${prompt}"
      
      OUTPUT TO AUDIT:
      "${JSON.stringify(output)}"
      
      Assign a score from 0.0 to 1.0 (where 1.0 is perfect).
      
      Return ONLY a valid JSON object:
      {
        "score": number,
        "reason": "concise technical explanation"
      }
    `;
  }

  private parse(text: string, type: string): JudgeResult {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      const parsed = JSON.parse(match[0]);
      return {
        type,
        score: typeof parsed.score === 'number' ? parsed.score : 0.2,
        reason: parsed.reason || "Unable to determine reason"
      };
    } catch (err) {
      return { type, score: 0.2, reason: "Parse failure" };
    }
  }

  private aggregate(judges: JudgeResult[]) {
    const weights: Record<string, number> = {
      relevance: 0.35,
      coherence: 0.25,
      quality: 0.25,
      strict: 0.15
    };

    let lambda = 0;
    let feedback: string[] = [];

    for (const j of judges) {
      lambda += j.score * (weights[j.type] || 0);
      feedback.push(`${j.type.toUpperCase()}: ${j.reason}`);
    }

    return {
      lambda: Math.min(Math.max(lambda, 0), 1),
      judges,
      feedback: feedback.join(" | ")
    };
  }
}
