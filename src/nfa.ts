import { StyleMode, styleText, unstyleText } from './math_style'
import { parse } from './regexp'
import {
  RegExp,
  RegExpOpAlter,
  RegExpOpConcat,
  RegExpOpStar,
} from './regexp_types'
import { EPS, encodeSet, powerset, unique } from './utils'

export class NFA {
  constructor(
    public states: number[],
    public alphabet: string[],
    public initialStates: number[],
    public finalStates: number[],
    public transitions: [number, string, number][],
  ) {
    this.makeUnique()
  }

  public normalize(start: number = 0) {
    const statesMap: Map<number, number> = new Map()
    this.states.forEach((k, i) => statesMap.set(k, i + start))

    function getState(x: number): number {
      return statesMap.get(x)!
    }

    this.states = this.states.map(getState)
    this.initialStates = this.initialStates.map(getState)
    this.finalStates = this.finalStates.map(getState)
    this.transitions = this.transitions.map(([p, a, q]) => [
      getState(p),
      a,
      getState(q),
    ])
  }

  public isDFA(): boolean {
    if (this.initialStates.length != 1) return false

    const stateCount: Map<string, number> = new Map()

    for (const [q1, a, _] of this.transitions) {
      const key: string = JSON.stringify([q1, a])

      stateCount.set(key, (stateCount.get(key) || 0) + 1)
    }

    for (const count of stateCount.values()) {
      if (count > 1) return false
    }

    return true
  }

  public makeUnique() {
    this.states = unique(this.states)
    this.alphabet = unique(this.alphabet)
    this.initialStates = unique(this.initialStates)
    this.finalStates = unique(this.finalStates)
    this.transitions = unique(this.transitions)
  }

  public isAccepted(w: string): boolean {
    const res = this.deltaStar(this.initialStates, w)
    return res.findIndex((q) => this.finalStates.includes(q)) != -1
  }

  public toDFA() {
    if (this.isDFA()) return

    const states = powerset(this.states)
    const initial = [this.initialStates]
    const final = states.filter(
      (q) => q.findIndex((p) => this.finalStates.includes(p)) != -1,
    )
    const transitions: [number, string, number][] = []

    for (const q of states) {
      for (const a of this.alphabet) {
        const q2 = this.transitions
          .filter(([p, b, _p2]) => q.includes(p) && b == a)
          .map(([_p, _b, p2]) => p2)
        transitions.push([encodeSet(q), a, encodeSet(q2)])
      }
    }

    return new NFA(
      states.map(encodeSet),
      this.alphabet,
      initial.map(encodeSet),
      final.map(encodeSet),
      transitions,
    )
  }

  public deltaEpsilon(
    q: number,
    filter: number[] = [],
    reverseEPSTransitions: boolean = false,
  ): number[] {
    if (!reverseEPSTransitions) {
      const accessible = this.transitions
        .filter(([p, a, p2]) => p == q && a == EPS && !filter.includes(p2))
        .map(([_, _a, p]) => p)

      filter.push(...accessible)

      return accessible
        .map((p) => [p, ...this.deltaEpsilon(p, filter, reverseEPSTransitions)])
        .flat()
    } else {
      const accessible = this.transitions
        .filter(([p, a, p2]) => p2 == q && a == EPS && !filter.includes(p))
        .map(([p, _a, _]) => p)

      filter.push(...accessible)

      return accessible
        .map((p) => [p, ...this.deltaEpsilon(p, filter, reverseEPSTransitions)])
        .flat()
    }
  }

  public delta(q: number, a: string): number[] {
    return this.transitions
      .filter(([p, b, _p2]) => p == q && a == b)
      .map(([_p, _b, p2]) => p2)
  }

  public deltaStar(
    start: number[],
    w: string,
    reverseEPSTransitions: boolean = false,
  ): number[] {
    let states = unique([
      ...start,
      ...start
        .map((q) => this.deltaEpsilon(q, [], reverseEPSTransitions))
        .flat(),
    ])

    for (const c of w) {
      const temp = states.map((p) => this.delta(p, c)).flat()
      states = unique([
        ...temp,
        ...temp
          .map((q) => this.deltaEpsilon(q, [], reverseEPSTransitions))
          .flat(),
      ])
    }

    return states
  }

  public reverse(): NFA {
    return new NFA(
      this.states,
      this.alphabet,
      this.finalStates,
      this.initialStates,
      this.transitions.map(([p, a, q]) => [q, a, p]),
    )
  }

  public reduce(): NFA {
    const rev = this.reverse()
    const rev2 = rev.toDFA() || rev
    rev2.removeUnreachable()
    const nfa = rev2.reverse()
    const nfa2 = rev2.toDFA() || nfa
    nfa2.removeUnreachable()
    return nfa2
  }

  public _reduce(): NFA {
    // This procedure isn't working...
    // With the automaton bellow, all states are marked
    // as indistinguishable, even though they aren't
    //
    //                            a
    //                        /--|
    //              a        /   |
    //  --> ((0)) -----> ((1))<--/
    //
    //  where 0 and 1 are final states, and 0 is also initial.
    //  It'll be reduces as
    //
    //               a
    //           /--|
    //          /   |
    //  --> ((0))<--/
    //
    //  Though "&" (the empty word) isn't accepted in the
    //  original DFA, it is in the reduced DFA.
    //
    /// PROCEDURE MARK

    // Step 1. Remove inaccessible states
    this.removeUnreachable()

    const marked: string[] = []

    // Step 2. Mark pairs of states, one final, but not the other
    for (const q of this.states) {
      if (this.finalStates.includes(q)) continue

      for (const p of this.finalStates) {
        marked.push(pair(p, q))
      }
    }

    // Step 3. "Extend" the distinguishable states
    let added = true
    while (added) {
      added = false
      for (const a of this.alphabet) {
        for (const q of this.states) {
          for (const p of this.states) {
            if (p == q) continue

            const p_aSet = this.deltaStar([p], a)
            const q_aSet = this.deltaStar([q], a)

            for (const p_a of p_aSet) {
              for (const q_a of q_aSet) {
                if (
                  marked.includes(pair(p_a, q_a)) &&
                  !marked.includes(pair(p, q))
                ) {
                  marked.push(pair(p, q))
                  added = true
                }
              }
            }
          }
        }
      }
    }
    /// END PROCEDURE MARK

    // Now that we have marked all distinguishable states,
    // we can safely remove the indistinguishable ones from the NFA.

    /// PROCEDURE REDUCE
    // Step 1. Find indistinguishable states pairs
    const indistinguishable = []

    for (const p of this.states) {
      for (const q of this.states) {
        if (p == q) continue

        if (!marked.includes(pair(p, q))) indistinguishable.push(pair(p, q))
      }
    }

    // Step 2. Merge indistinguishable subsets of states in a state each

    // We find the components of the graph with states as vertices
    // and indistinguishable pairs as edges

    let statesToDo = [...this.states]
    const components: number[][] = []

    while (statesToDo.length > 0) {
      const p = statesToDo.pop()!
      const component = [p]

      let hasExtended = true
      while (hasExtended) {
        hasExtended = false
        for (const q of statesToDo) {
          if (indistinguishable.includes(pair(p, q))) {
            component.push(q)
            statesToDo = statesToDo.filter((q2) => q2 != q)
            hasExtended = true
          }
        }
      }

      components.push(component)
    }

    // Step 3. Create the transitions

    //const states = components.map((_, i) => i)
    const states = components.map((component) => Math.min(...component))
    const transitions: [number, string, number][] = []
    for (const [p, a, q] of this.transitions) {
      const pComp = components.findIndex((c) => c.includes(p))
      const qComp = components.findIndex((c) => c.includes(q))
      transitions.push([states[pComp], a, states[qComp]])
    }

    // Step 4. Add the initial states
    const initials = components
      .map((c, i) =>
        c.findIndex((p) => this.initialStates.includes(p)) != -1
          ? states[i]
          : -1,
      )
      .filter((i) => i >= 0)

    // Step 5. Add the final states
    const finals = components
      .map((c, i) =>
        c.findIndex((p) => this.finalStates.includes(p)) != -1 ? states[i] : -1,
      )
      .filter((i) => i >= 0)

    return new NFA(states, this.alphabet, initials, finals, unique(transitions))
  }

  public reachableStates(from: number[] = this.initialStates): number[] {
    let reachable = [...from]

    let hasAdded = true

    while (hasAdded) {
      hasAdded = false
      for (const a of this.alphabet) {
        for (const q of reachable) {
          const newStates = this.delta(q, a).filter(
            (p) => !reachable.includes(p),
          )
          reachable.push(...newStates)

          if (newStates.length > 0) hasAdded = true
        }
      }
    }

    return reachable
  }

  public removeUnreachable() {
    const reachable = this.reachableStates()
    this.states = reachable
    this.initialStates = this.initialStates.filter((q) => reachable.includes(q))
    this.finalStates = this.finalStates.filter((q) => reachable.includes(q))
    this.transitions = this.transitions.filter(
      ([q, _, p]) => reachable.includes(q) && reachable.includes(p),
    )
  }

  public isComplete(): boolean {
    if (this.initialStates.length == 0) return false

    const stateCount: Map<string, number> = new Map()

    for (const [q1, a, _] of this.transitions) {
      const key: string = JSON.stringify([q1, a])

      stateCount.set(key, (stateCount.get(key) || 0) + 1)
    }

    for (const q of this.states) {
      for (const a of this.alphabet) {
        if (!stateCount.has(JSON.stringify([q, a]))) return false
      }
    }

    return true
  }

  public complete() {
    if (this.isComplete()) return

    const q = Math.max(...this.states) + 1
    const toAdd: [number, string, number][] = []

    const stateCount: Map<string, number[]> = new Map()

    for (const [q1, a, q2] of this.transitions) {
      const key: string = JSON.stringify([q1, a])

      if (stateCount.has(key)) stateCount.get(key)!.push(q2)
      else stateCount.set(key, [q2])
    }

    for (const p of this.states) {
      for (const a of this.alphabet) {
        if (!stateCount.has(JSON.stringify([p, a]))) {
          toAdd.push([p, a, q])
        }
      }
    }

    for (const a of this.alphabet) {
      toAdd.push([q, a, q])
    }

    this.transitions.push(...toAdd)
    this.states.push(q)

    return this
  }

  public removeEPS() {
    let removeEPSFrom = (q: number) => {
      const toAdd: [number, string, number][] = []

      for (const [p, ..._] of this.transitions.filter(
        ([_, a, p]) => a == EPS && p == q,
      )) {
        for (const [_, a, p2] of this.transitions.filter(
          ([p2, ..._]) => p2 == q,
        )) {
          //     &      a|&
          // p ----> q ----> p2
          //
          // becomes
          //    a|&
          // p ----> p2
          //
          // we do not need to check q != p2 since those
          // transitions have already been removed
          toAdd.push([p, a, p2])
        }
      }

      this.transitions.push(...toAdd)
      this.transitions = this.transitions.filter(
        ([_, a, p]) => !(p == q && a == EPS),
      )
    }

    this.transitions = this.transitions.filter(
      ([p, a, p2]) => !(a == EPS && p == p2),
    )

    this.finalStates = this.deltaStar(this.finalStates, '', true)

    this.states.forEach(removeEPSFrom)
    this.alphabet = this.alphabet.filter((a) => a != EPS)

    return this
  }

  static fromRegExp(r: RegExp): NFA {
    if (typeof r == 'string') {
      // { a }
      const a = styleText(r, StyleMode.TYPEWRITTER)
      return new NFA([0, 1], [a], [0], [1], [[0, a, 1]])
    }

    switch (r.op) {
      case 'concatenation':
        return concatNFA(NFA.fromRegExp(r.left), NFA.fromRegExp(r.right))
      case 'alternative':
        return alternNFA(NFA.fromRegExp(r.left), NFA.fromRegExp(r.right))
      case 'star':
        return starNFA(NFA.fromRegExp(r.expr))
    }
  }

  public copy(): NFA {
    return new NFA(
      [...this.states],
      [...this.alphabet],
      [...this.initialStates],
      [...this.finalStates],
      [...this.transitions],
    )
  }

  public toRegExp(): RegExp {
    const auto = this.copy()
    auto.normalize(2)
    const init = 0
    const final = 1

    auto.states.push(init, final)

    for (const i of auto.initialStates) auto.transitions.push([init, EPS, i])
    for (const f of auto.finalStates) auto.transitions.push([f, EPS, final])

    for (const q of auto.states) {
      if (q == init || q == final) continue

      // PROCEDURE 1. Remove outgoing transitions from state q

      // Merge all transitions like q ---> q'

      const out = auto.transitions.filter(([p, ..._]) => p == q)
      auto.transitions = auto.transitions.filter(([p, ..._]) => p != q)

      const map: Map<number, string[]> = new Map()

      for (const [_, a, p2] of out) {
        if (map.has(p2)) map.get(p2)?.push(a)
        else map.set(p2, [a])
      }

      for (const [p, labels] of map.entries()) {
        auto.transitions.push([q, '(' + unique(labels).join('|') + ')', p])
      }

      // PROCEDURE 2. Remove state q
      //                                 z
      //                                |-|
      //    x     y                  x  \ v  y
      // p --> q --> r     or     p  -->  q  -->  r
      const xs = auto.transitions.filter(([_p, _a, p2]) => p2 == q)
      const ys = auto.transitions.filter(([p, ..._]) => p == q)

      auto.transitions = auto.transitions.filter(
        (t) => !xs.includes(t) && !ys.includes(t),
      )

      const zs = xs.filter((t) => ys.includes(t))

      if (zs.length > 0) {
        // 2nd case
        // replace by xz*y

        const zstar = '(' + unique(zs.map(([_p, a, _q]) => a)).join('|') + ')*'

        for (const [p, x, p2] of xs) {
          if (p2 == p) continue

          for (const [r2, y, r] of ys) {
            if (r == r2) continue

            auto.transitions.push([p, '(' + x + zstar + y + ')', r])
          }
        }
      } else {
        // 1st case
        // replace by xy

        for (const [p, x, _] of xs) {
          for (const [_, y, r] of ys) {
            auto.transitions.push([p, '(' + x + y + ')', r])
          }
        }
      }
    }

    // Only transitions remaining are between state 0 and 1
    // (i.e. initial and final state)

    const input = unstyleText(
      unique(
        auto.transitions
          .filter(([p, _, q]) => p == init && q == final)
          .map(([_p, a, _q]) => a),
      ).join('|'),
    )

    return simplify(parse(input))
  }
}

export function concatNFA(left: NFA, right: NFA): NFA {
  const maxLeft = Math.max(...left.states)
  right.normalize(maxLeft + 1)

  const transitions = [...left.transitions, ...right.transitions]

  for (const p of left.finalStates) {
    for (const q of right.initialStates) {
      transitions.push([p, EPS, q])
    }
  }

  return new NFA(
    left.states.concat(right.states),
    unique(left.alphabet.concat(right.alphabet)),
    left.initialStates,
    right.finalStates,
    transitions,
  )
}

function alternNFA(left: NFA, right: NFA): NFA {
  const maxLeft = Math.max(...left.states)
  right.normalize(maxLeft + 1)

  return new NFA(
    left.states.concat(right.states),
    unique(left.alphabet.concat(right.alphabet)),
    left.initialStates.concat(right.initialStates),
    right.finalStates.concat(left.finalStates),
    [...left.transitions, ...right.transitions],
  )
}

function starNFA(nfa: NFA): NFA {
  nfa.normalize(1)

  const transitions = [...nfa.transitions]

  for (const p of nfa.finalStates) {
    for (const q of nfa.initialStates) {
      transitions.push([p, EPS, q])
    }
  }

  for (const q of nfa.initialStates) {
    transitions.push([0, EPS, q])
  }

  return new NFA(
    [0, ...nfa.states],
    nfa.alphabet,
    [0],
    [0, ...nfa.finalStates],
    transitions,
  )
}

function pair(p: number, q: number): string {
  return JSON.stringify([Math.min(p, q), Math.max(p, q)])
}

export function simplify(r: RegExp): RegExp {
  let [s, b] = _simplify(r)

  while (b) {
    ;[s, b] = _simplify(s)
  }

  return s
}

function _simplify(e: RegExp): [RegExp, boolean] {
  if (typeof e == 'string') return [e, false]

  switch (e.op) {
    case 'concatenation': {
      const [s, b] = simplifyConcat(e)
      if (b) {
        return _simplify(s)
      } else {
        const [left, lb] = _simplify(e.left)
        const [right, rb] = _simplify(e.right)
        return [{ op: 'concatenation', left, right }, lb || rb]
      }
    }
    case 'alternative': {
      const [s, b] = simplifyAlter(e)
      if (b) {
        return _simplify(s)
      } else {
        const [left, lb] = _simplify(e.left)
        const [right, rb] = _simplify(e.right)
        return [{ op: 'alternative', left, right }, lb || rb]
      }
    }

    case 'star': {
      const [s, b] = simplifyStar(e)
      if (b) {
        return _simplify(s)
      } else {
        const [expr, eb] = _simplify(e.expr)
        return [{ op: 'star', expr }, eb]
      }
    }
  }
}

function simplifyConcat(r: RegExpOpConcat): [RegExp, boolean] {
  // &x    -> x
  // x&    -> x
  // (xy)z -> x(yz)

  if (r.left == '&') return [r.right, true]
  if (r.right == '&') return [r.left, true]
  if (typeof r.left != 'string' && r.left.op == 'concatenation')
    return [
      {
        op: 'concatenation',
        left: r.left.left,
        right: simplifyConcat({
          op: 'concatenation',
          left: r.left.right,
          right: r.right,
        })[0],
      },
      true,
    ]

  return [r, false]
}

function simplifyAlter(r: RegExpOpAlter): [RegExp, boolean] {
  // x|x             -> x
  // (x|y)|z         -> x|(y|z)
  // x|y when y <= x -> y|x
  // x|(x|y)         -> x|y

  if (r.left == r.right) return [r.left, true]
  if (typeof r.left != 'string' && r.left.op == 'alternative')
    return [
      {
        op: 'alternative',
        left: r.left.left,
        right: simplifyAlter({
          op: 'alternative',
          left: r.left.right,
          right: r.right,
        })[0],
      },
      true,
    ]
  if (
    typeof r.left == 'string' &&
    typeof r.right == 'string' &&
    r.right <= r.left
  )
    return [
      simplifyAlter({ op: 'alternative', left: r.left, right: r.right })[0],
      true,
    ]
  if (
    typeof r.right != 'string' &&
    r.right.op == 'alternative' &&
    r.left == r.right.left
  )
    return [
      simplifyAlter({
        op: 'alternative',
        left: r.left,
        right: r.right.right,
      })[0],
      true,
    ]

  return [r, false]
}

function simplifyStar(r: RegExpOpStar): [RegExp, boolean] {
  // &* -> &

  if (r.expr == '&') return ['&', true]

  return [r, false]
}

export function toString(r: RegExp): string {
  if (typeof r == 'string') return r
  if (r.op == 'star') return parens(r.expr) + '*'
  if (
    r.op == 'concatenation' &&
    typeof r.right != 'string' &&
    r.right.op == 'concatenation'
  )
    return parens(r.left) + toString(r.right)
  if (r.op == 'concatenation') return parens(r.left) + parens(r.right)
  if (
    r.op == 'alternative' &&
    typeof r.right != 'string' &&
    r.right.op == 'alternative'
  )
    return parens(r.left) + '|' + toString(r.right)
  if (r.op == 'alternative') return parens(r.left) + '|' + parens(r.right)

  return '[ERROR]' // This shouldn't happen...
}

function parens(r: RegExp): string {
  if (typeof r == 'string') return r
  if (r.op == 'star') return toString(r)

  return '(' + toString(r) + ')'
}

export default NFA
