export class UnionFind {
  private parent: { [key: string]: string } = {}
  private rank: { [key: string]: number } = {}

  find(x: string): string {
    if (!this.parent[x]) this.parent[x] = x
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }

  union(x: string, y: string) {
    const rootX = this.find(x)
    const rootY = this.find(y)
    if (rootX === rootY) return

    if (!this.rank[rootX]) this.rank[rootX] = 0
    if (!this.rank[rootY]) this.rank[rootY] = 0

    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX
    } else {
      this.parent[rootY] = rootX
      this.rank[rootX]++
    }
  }
} 