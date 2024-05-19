import { EPS } from './utils'

export const charItalicsMap: Record<string, string> = {
  a: '𝑎',
  A: '𝐴',
  b: '𝑏',
  B: '𝐵',
  c: '𝑐',
  C: '𝐶',
  d: '𝑑',
  D: '𝐷',
  e: '𝑒',
  E: '𝐸',
  f: '𝑓',
  F: '𝐹',
  g: '𝑔',
  G: '𝐺',
  h: 'ℎ',
  H: '𝐻',
  i: '𝑖',
  I: '𝐼',
  j: '𝑗',
  J: '𝐽',
  k: '𝑘',
  K: '𝐾',
  l: '𝑙',
  L: '𝐿',
  m: '𝑚',
  M: '𝑀',
  n: '𝑛',
  N: '𝑁',
  o: '𝑜',
  O: '𝑂',
  p: '𝑝',
  P: '𝑃',
  q: '𝑞',
  Q: '𝑄',
  r: '𝑟',
  R: '𝑅',
  s: '𝑠',
  S: '𝑆',
  t: '𝑡',
  T: '𝑇',
  u: '𝑢',
  U: '𝑈',
  v: '𝑣',
  V: '𝑉',
  w: '𝑤',
  W: '𝑊',
  x: '𝑥',
  X: '𝑋',
  y: '𝑦',
  Y: '𝑌',
  z: '𝑧',
  Z: '𝑍',
  '&': EPS,
}

export const charTypeWritterMap: Record<string, string> = {
  a: '𝚊',
  A: '𝙰',
  b: '𝚋',
  B: '𝙱',
  c: '𝚌',
  C: '𝙲',
  d: '𝚍',
  D: '𝙳',
  e: '𝚎',
  E: '𝙴',
  f: '𝚏',
  F: '𝙵',
  g: '𝚐',
  G: '𝙶',
  h: '𝚑',
  H: '𝙷',
  i: '𝚒',
  I: '𝙸',
  j: '𝚓',
  J: '𝙹',
  k: '𝚔',
  K: '𝙺',
  l: '𝚕',
  L: '𝙻',
  m: '𝚖',
  M: '𝙼',
  n: '𝚗',
  N: '𝙽',
  o: '𝚘',
  O: '𝙾',
  p: '𝚙',
  P: '𝙿',
  q: '𝚚',
  Q: '𝚀',
  r: '𝚛',
  R: '𝚁',
  s: '𝚜',
  S: '𝚂',
  t: '𝚝',
  T: '𝚃',
  u: '𝚞',
  U: '𝚄',
  v: '𝚟',
  V: '𝚅',
  w: '𝚠',
  W: '𝚆',
  x: '𝚡',
  X: '𝚇',
  y: '𝚢',
  Y: '𝚈',
  z: '𝚣',
  Z: '𝚉',
  '&': EPS,
}

export const charLowerMap: Record<string, string> = {
  0: '₀',
  1: '₁',
  2: '₂',
  3: '₃',
  4: '₄',
  5: '₅',
  6: '₆',
  7: '₇',
  8: '₈',
  9: '₉',
}

export enum StyleMode {
  NORMAL,
  ITALICS,
  TYPEWRITTER,
}

export function styleText(
  text: string,
  style: StyleMode = StyleMode.ITALICS,
): string {
  let res = ''

  for (let i = 0; i < text.length; i++) {
    if (text[i] == '_') {
      res += charLowerMap[text[i + 1]] || '_' + text[i + 1]
      i++
    } else if (text[i] == '&') {
      res += EPS
    } else {
      if (style == StyleMode.ITALICS) res += charItalicsMap[text[i]] || text[i]
      else if (style == StyleMode.TYPEWRITTER)
        res += charTypeWritterMap[text[i]] || text[i]
      else res += text[i]
    }
  }

  return res
}

export const unstyleMap: Record<string,string> = {};

for(const [ascii, res] of Object.entries(charLowerMap)) {
  unstyleMap[res] = '_' + ascii
}

for(const [ascii, res] of Object.entries(charTypeWritterMap)) {
  unstyleMap[res] = ascii
}

for(const [ascii, res] of Object.entries(charItalicsMap)) {
  unstyleMap[res] = ascii
}

export function unstyleText(text: string) {
  return [...text].map(l => unstyleMap[l] || l).join('')
}
