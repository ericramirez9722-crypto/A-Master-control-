
export type MemoryItem = {
  input: string;
  embedding: number[];
  output: any;
  lambda: number;
  cost: number;
  strategy: any;
  timestamp: number;
};

export class MemoryStore {
  db: MemoryItem[] = [];

  // Simulate embedding generation (in a real app, use Gemini API)
  async embed(text: string): Promise<number[]> {
    // Deterministic fake embedding for consistency during simulation
    const chars = text.slice(0, 16).split('').map(c => c.charCodeAt(0) / 255);
    while (chars.length < 16) chars.push(0);
    return chars;
  }

  async store(item: Omit<MemoryItem, "embedding">) {
    const embedding = await this.embed(item.input);
    this.db.push({ ...item, embedding });
    console.log(`[MEMORY_STORE] Persisted experience for: "${item.input.slice(0, 30)}..."`);
  }

  cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += (a[i] * b[i]);
        mA += (a[i] * a[i]);
        mB += (b[i] * b[i]);
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return (dotProduct) / (mA * mB);
  }

  async findSimilar(input: string, k = 3) {
    if (this.db.length === 0) return [];
    
    const emb = await this.embed(input);

    return this.db
      .map(m => ({
        ...m,
        sim: this.cosineSimilarity(emb, m.embedding)
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, k);
  }
}
