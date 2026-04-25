
export class Adjuster {
  adjust(prompt: string, evalResult: any) {
    if (evalResult.lambda < 0.6) {
      return `${prompt}\nFix issues identified by Neural Evaluators:\n${evalResult.feedback}`;
    }

    if (evalResult.lambda < 0.85) {
      return `${prompt}\nImprove technical quality based on feedback:\n${evalResult.feedback}`;
    }

    return prompt;
  }
}
