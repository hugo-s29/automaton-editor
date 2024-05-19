import createLayout from 'ngraph.forcelayout'
import createGraph from 'ngraph.graph'
import NFA from './nfa'

export interface Position {
  x: number
  y: number
}

export function layoutAutomaton(
  nfa: NFA,
  width: number,
  height: number,
): Position[] {
  const graph = createGraph()

  const init = nfa.initialStates
  const final = nfa.finalStates
  const mid = nfa.states.filter((s) => !init.includes(s) && !final.includes(s))

  for (const state of init) graph.addNode(state)
  for (const state of mid) graph.addNode(state)
  for (const state of final) graph.addNode(state)

  for (const [q, _, p] of nfa.transitions) graph.addLink(q, p)

  const layout = createLayout(graph)

  for (let i = 0; i < 1e5; i++) {
    layout.step()
  }

  const pos = nfa.states
    .map((q) => layout.getNodePosition(q))
    .map(({ x, y }) => ({ x, y }))

  const xs = pos.map(({ x }) => x)
  const ys = pos.map(({ y }) => y)
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]

  const midX = (maxX + minX) / 2
  const midY = (maxY + minY) / 2
  const p = 0.9

  const safe = (x: number) => (isNaN(x) || !isFinite(x) ? 1 : x)

  const kX = safe((p * width) / (maxX - minX))
  const kY = safe((p * height) / (maxY - minY))

  return pos.map(({ x, y }) => ({
    x: (x - midX) * kX + width / 2,
    y: (y - midY) * kY + height / 2,
  }))
}

export default layoutAutomaton
