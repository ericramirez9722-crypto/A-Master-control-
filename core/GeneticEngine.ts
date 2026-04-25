
export class GeneticEngine {
  mutate(prompt: string) {
    const mutations = [
      "be more precise",
      "use structured reasoning",
      "optimize clarity",
      "focus on accuracy",
      "incorporate technical nuance",
      "maximize aesthetic coherence"
    ];
    const m = mutations[Math.floor(Math.random() * mutations.length)];
    return `${prompt}\n[MUTATION: ${m}]`;
  }

  crossover(a: string, b: string) {
    const mid = Math.floor(a.length / 2);
    return a.slice(0, mid) + " " + b.slice(mid);
  }

  evolve(population: string[], scores: number[]) {
    if (population.length < 2) return population;

    // Selection: Sort by performance (λ)
    const ranked = population
      .map((p, i) => ({ p, s: scores[i] ?? 0 }))
      .sort((a, b) => b.s - a.s);

    const [p1, p2] = [ranked[0].p, ranked[1].p];

    return [
      p1,               // Elite preservation (the winner)
      p2,               // Runner up
      this.mutate(p1),  // Mutated winner
      this.mutate(p2),  // Mutated runner up
      this.crossover(p1, p2) // Recombinant offspring
    ];
  }
}
