export function remap(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
): number {
  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2
}

export function unique<T>(l: T[]): T[] {
  const l2 = l.map((v) => JSON.stringify(v))
  return l.filter((_, i) => i == l2.indexOf(l2[i]))
}

export function powerset<T>(l: T[]): T[][] {
  return l.reduce<T[][]>(
    (subsets, value) => subsets.concat(subsets.map((set) => [value, ...set])),
    [[]],
  )
}

export function encodeSet(l: number[]): number {
  return unique(l).reduce((acc, k) => acc + 2 ** k, 0)
}

export function removeEps(w: string): string {
  return w.replace(/𝜀|ε/gm, '')
}

export const EPS = '𝜀'

export function shuffle<T>(l: T[]): T[] {
  return l.sort(() => Math.random() - 0.5)
}
