export interface Searchable {
  id: number
  name: string
  plu_code?: string
  category?: string
  price?: number
  combo_price?: number | null
}

export interface ScoredResult {
  score: number
  matchType: 'plu' | 'exact' | 'starts' | 'contains' | 'fuzzy'
}

const normalize = (s: string) =>
  s.toLowerCase()
    .replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z')
    .replace(/[^\w\s]/g, '')
    .trim()

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function tokenMatch(query: string, name: string): boolean {
  const qTokens = query.split(/\s+/).filter(Boolean)
  const nTokens = name.split(/\s+/).filter(Boolean)
  return qTokens.every(qt => nTokens.some(nt => nt.startsWith(qt)))
}

export function fuzzySearch<T extends Searchable>(
  items: T[],
  query: string,
  limit = 10
): (T & ScoredResult)[] {
  if (!query || query.length < 1) return []

  const q = normalize(query)
  const results: (T & ScoredResult)[] = []

  for (const item of items) {
    const n = normalize(item.name)
    const plu = normalize(item.plu_code || '')
    const cat = normalize(item.category || '')
    let score = 0
    let matchType: ScoredResult['matchType'] = 'fuzzy'

    if (plu && (plu === q || item.plu_code === query)) {
      score = 1000
      matchType = 'plu'
    } else if (n === q) {
      score = 500
      matchType = 'exact'
    } else if (n.startsWith(q)) {
      score = 300 + (q.length / n.length) * 100
      matchType = 'starts'
    } else if (n.includes(q)) {
      const idx = n.indexOf(q)
      score = 200 + (1 - idx / n.length) * 50 + (q.length / n.length) * 50
      matchType = 'contains'
    } else if (cat.includes(q)) {
      score = 100
      matchType = 'contains'
    } else if (tokenMatch(q, n)) {
      score = 80
      matchType = 'fuzzy'
    } else {
      const dist = levenshtein(q, n.slice(0, q.length + 3))
      const maxLen = Math.max(q.length, n.length)
      if (dist <= 2 && q.length >= 3) {
        score = 50 - dist * 10
        matchType = 'fuzzy'
      } else if (q.length >= 3) {
        let qi = 0, consecutive = 0, totalMatch = 0
        for (let ni = 0; ni < n.length && qi < q.length; ni++) {
          if (n[ni] === q[qi]) {
            qi++
            totalMatch++
            consecutive++
          } else {
            consecutive = 0
          }
        }
        if (qi === q.length) {
          score = 10 + totalMatch * 2 + consecutive * 5
          matchType = 'fuzzy'
        }
      }
    }

    if (score > 0) {
      results.push({ ...item, score, matchType })
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
