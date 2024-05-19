import Automaton from './automaton'
import State, { StateType } from './state'
import Transition from './transition'

export interface StateSave {
  stateID: number
  x: number
  y: number
  type: StateType
  text: string
}

export interface SaveInstance {
  states: StateSave[]
  transitions: [number, string, number][]
}

export const MAX_SAVE_LENGTH = 100

export class SaveSystem {
  public saves: SaveInstance[] = []
  public undone: SaveInstance[] = []
  public current: SaveInstance | null = null

  constructor(public auto: Automaton) {
    this.save()
  }

  public save() {
    const states: StateSave[] = []
    const transitionMap: Map<Transition, number> = new Map()
    const transitions: [number, string, number][] = []

    for (const transition of this.auto.transitions) {
      const t: [number, string, number] = [
        transition.startState.stateID,
        transition.text,
        transition.endState.stateID,
      ]

      const k = transitions.push(t) - 1
      transitionMap.set(transition, k)
    }

    for (const q of this.auto.states) {
      states.push({
        stateID: q.stateID,
        x: q.x(),
        y: q.y(),
        type: q.type,
        text: q.text,
      })
    }

    const save = { states, transitions }

    if (this.current) this.saves.push(this.current)

    this.current = save
    this.undone = []

    while (this.saves.length >= MAX_SAVE_LENGTH) {
      this.saves.shift()
    }
  }

  public undo() {
    if (!this.current) return

    const last = this.saves.pop()
    if (!last) return

    this.apply(last)
    this.undone.push(this.current)
    this.current = last

    while (this.undone.length >= MAX_SAVE_LENGTH) {
      this.undone.shift()
    }
  }

  public redo() {
    if (!this.current) return

    const last = this.undone.pop()
    if (!last) return

    this.apply(last)
    this.saves.push(this.current)
    this.current = last
  }

  public apply(save: SaveInstance) {
    this.auto.clearAll(false)

    const states = save.states.map(
      (q) => new State(q.stateID, q.text, q.x, q.y, q.type),
    )

    states.forEach((q) => this.auto.addState(q))

    for (const [q, text, p] of save.transitions) {
      const t = new Transition(states[q], states[p], text)
      this.auto.addTransition(t)
    }
  }
}
