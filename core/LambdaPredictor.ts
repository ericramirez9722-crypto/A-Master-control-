
export class LambdaPredictor {
  /**
   * Predicts potential success (Λ) based on prompt characteristics
   * before spending API tokens.
   */
  predict(prompt: string): number {
    let score = 0.5;

    // Length heuristic (too short is usually vague)
    if (prompt.length > 50) score += 0.1;
    if (prompt.length > 200) score += 0.05;

    // Keyword heuristics
    if (prompt.toLowerCase().includes("structured")) score += 0.1;
    if (prompt.toLowerCase().includes("precise")) score += 0.1;
    if (prompt.toLowerCase().includes("technical")) score += 0.05;
    if (prompt.toLowerCase().includes("pbr")) score += 0.05;
    if (prompt.toLowerCase().includes("lighting")) score += 0.05;
    
    // Negative heuristics
    if (prompt.length < 10) score -= 0.2;

    return Math.min(Math.max(score, 0.1), 0.95);
  }
}
