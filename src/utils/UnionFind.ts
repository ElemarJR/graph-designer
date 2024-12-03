export class UnionFind {
  private parent: { [key: string]: string } = {}
  private rank: { [key: string]: number } = {}

  makeSet(x: string) {
    this.parent[x] = x
    this.rank[x] = 0
  }

  find(x: string): string {
    if (!this.parent[x]) {
      this.makeSet(x)
    }
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]) // Path compression
    }
    return this.parent[x]
  }

  union(x: string, y: string) {
    const rootX = this.find(x)
    const rootY = this.find(y)
    
    if (rootX === rootY) return // Already in same set

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX
    } else {
      this.parent[rootY] = rootX
      this.rank[rootX]++
    }
  }

  getParentState(): Record<string, string> {
    return { ...this.parent }
  }

  getRankState(): Record<string, number> {
    return { ...this.rank }
  }
}