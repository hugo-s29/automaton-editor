import Konva from 'konva'
import State, { StateType } from './state'
import Transition from './transition'
import { unique } from './utils'
import NFA from './nfa'
import layoutAutomaton from './layout'
import { KonvaEventObject } from 'konva/lib/Node'
import { SaveSystem } from './save_system'
import { unstyleText } from './math_style'

export enum ControlMode {
  ADD_STATES,
  ADD_TRANSITIONS,
  DISPLAY,
}

export enum MenuMode {
  CLOSED = -1,
  NORMAL = 0,
  STATE = 1,
  LABEL = 2,
}

export class Automaton {
  public states: State[] = []
  public transitions: Transition[] = []
  public mode: ControlMode = ControlMode.ADD_STATES
  public saveSystem = new SaveSystem(this)

  // Transition creation properties
  public startingState: State | null = null
  public creationTransition: Transition | null = null
  public followMouseState: State = new State(-1, '', 0, 0) // never add this to any layer, should not be displayed

  public stateLayer = new Konva.Layer()
  public transitionLayer = new Konva.Layer()

  public stage = new Konva.Stage({
    container: 'container',
    width: 800,
    height: 600,
    draggable: true,
  })
  public menuState: MenuMode = MenuMode.CLOSED
  public selected: State | Transition | null = null

  constructor(gridLayer: Konva.Layer, public menu: HTMLDivElement[]) {
    this.stage.add(gridLayer)
    this.stage.add(this.transitionLayer)
    this.stage.add(this.stateLayer)

    this.stage.on('mousemove', () => {
      const pointerPos = this.stage.getPointerPosition() || {
        x: this.stage.width() / 2,
        y: this.stage.height() / 2,
      }
      const actualPos = {
        x: (pointerPos.x - this.stage.x()) / this.stage.scaleX(),
        y: (pointerPos.y - this.stage.y()) / this.stage.scaleY(),
      }
      this.followMouseState.x(actualPos.x)
      this.followMouseState.y(actualPos.y)
      if (this.creationTransition != null) {
        this.creationTransition.adjust()
      }
    })

    document.addEventListener('click', (e) => {
      if (e.button === 0) {
        this.closeMenu()
      }
    })

    this.followMouseState.circle.radius(0)

    window.addEventListener('keydown', (evt) => {
      if (evt.key == 'Escape') {
        this.creationTransition?.destroy()
        this.creationTransition = null
        this.startingState = null
        this.closeMenu()
      }

      if (evt.metaKey) {
        if (evt.key.toLowerCase() == 'z') {
          // Ctrl+Shift+Z
          if (evt.shiftKey) this.saveSystem.redo()
          // Ctrl+Z
          else this.saveSystem.undo()
        }
        // Ctrl+Y
        else if (evt.key.toLowerCase() == 'y') {
          this.saveSystem.redo()
        }
      }

      if (evt.metaKey || evt.altKey || evt.ctrlKey) return

      switch (evt.key.toLowerCase()) {
        case 's':
          this.mode = ControlMode.ADD_STATES
          return
        case 't':
          this.mode = ControlMode.ADD_TRANSITIONS
          return
      }
    })

    this.stage.on('pointerdblclick', (e: KonvaEventObject<MouseEvent>) => {
      if (e.evt.button != 0 || this.mode != ControlMode.ADD_STATES) return

      const pointerPos = this.stage.getPointerPosition() || {
        x: this.stage.width() / 2,
        y: this.stage.height() / 2,
      }
      const actualPos = {
        x: (pointerPos.x - this.stage.x()) / this.stage.scaleX(),
        y: (pointerPos.y - this.stage.y()) / this.stage.scaleY(),
      }

      const stateNum =
        this.states.length == 0
          ? 0
          : Math.max(...this.states.map((s) => s.stateID)) + 1

      const stateID = stateNum
        .toString()
        .split('')
        .map((c) => '_' + c)
        .join('')
      const q = new State(
        this.states.length,
        'q' + stateID,
        actualPos.x,
        actualPos.y,
      )
      this.addState(q)
      this.stateLayer.add(q)

      this.saveSystem.save()
    })

    this.transitionLayer.draw()
    this.stateLayer.draw()
  }

  public addState(q: State) {
    this.states.push(q)
    this.stateLayer.add(q)
    q.automaton = this
  }

  public openMenu(
    event: MouseEvent,
    mode: MenuMode,
    selected: State | Transition | null = null,
  ) {
    event.preventDefault()
    if (this.menuState != MenuMode.CLOSED)
      this.menu[this.menuState].classList.remove('block')
    this.menuState = mode
    this.selected = selected
    this.menu[this.menuState].classList.add('block')
    this.positionMenu(event)
  }

  public closeMenu() {
    if (this.menuState == MenuMode.CLOSED) return

    this.menu[this.menuState].classList.remove('block')
    this.menuState = MenuMode.CLOSED
    this.selected = null
  }

  public getPosition(e: MouseEvent) {
    let posx = 0
    let posy = 0

    if (e.pageX || e.pageY) {
      posx = e.pageX
      posy = e.pageY
    } else if (e.clientX || e.clientY) {
      posx =
        e.clientX +
        document.body.scrollLeft +
        document.documentElement.scrollLeft
      posy =
        e.clientY + document.body.scrollTop + document.documentElement.scrollTop
    }

    return {
      x: posx,
      y: posy,
    }
  }

  public positionMenu(e: MouseEvent) {
    const menu = this.menu[this.menuState]
    let clickCoords = this.getPosition(e)
    let clickCoordsX = clickCoords.x
    let clickCoordsY = clickCoords.y

    let menuWidth = menu.offsetWidth + 4
    let menuHeight = menu.offsetHeight + 4

    let windowWidth = window.innerWidth
    let windowHeight = window.innerHeight

    if (windowWidth - clickCoordsX < menuWidth) {
      menu.style.left = windowWidth - menuWidth + 'px'
    } else {
      menu.style.left = clickCoordsX + 'px'
    }

    if (windowHeight - clickCoordsY < menuHeight) {
      menu.style.top = windowHeight - menuHeight + 'px'
    } else {
      menu.style.top = clickCoordsY + 'px'
    }
  }

  public addTransition(t: Transition) {
    const t2 = t.startState.transitions.findIndex(
      (t2) =>
        t2.endState.stateID == t.endState.stateID &&
        t2.startState.stateID == t.startState.stateID,
    )

    if (t2 != -1) {
      const text = t.startState.transitions[t2].text + ',' + t.text
      t.startState.transitions[t2].text = text
      t.startState.transitions[t2].label.text(text)
      t.destroy()
      return
    }

    this.transitions.push(t)
    this.transitionLayer.add(t)

    t.startState.addTransition(t)
    t.endState.addTransition(t)

    t.adjust()

    t.startState.on('dragmove', t.adjust)
    t.endState.on('dragmove', t.adjust)
  }

  public toNFA(): NFA {
    const states = unique(this.states.map((s) => s.stateID))
    const alphabet = unique(
      this.transitions.map((t) => t.text.split(',')).flat(),
    )
    const initial = unique(
      this.states
        .filter(
          (s) =>
            s.type == StateType.STATE_INITIAL ||
            s.type == StateType.STATE_INITIAL_FINAL,
        )
        .map((s) => s.stateID),
    )
    const final = unique(
      this.states
        .filter(
          (s) =>
            s.type == StateType.STATE_FINAL ||
            s.type == StateType.STATE_INITIAL_FINAL,
        )
        .map((s) => s.stateID),
    )
    const transitions = unique<[number, string, number]>(
      this.transitions
        .map((t) => t.text.split(',').map((text) => ({ t, text })))
        .flat()
        .map(({ t, text }) => [t.startState.stateID, text, t.endState.stateID]),
    )

    return new NFA(states, alphabet, initial, final, transitions)
  }

  public fromNFA(nfa: NFA) {
    this.states.forEach((s) => s.destroy())
    this.transitions.forEach((s) => s.destroy())
    this.creationTransition?.destroy()

    nfa.makeUnique()

    const [w, h] = [this.stage.width(), this.stage.height()]
    const layout = layoutAutomaton(nfa, w, h)

    this.states = []
    this.transitions = []

    const states = nfa.states.map((q, i) => {
      const stateID =
        'q' +
        q
          .toString()
          .split('')
          .map((c) => '_' + c)
          .join('')

      const { x, y } = layout[i]

      const state = new State(q, stateID, x, y)

      const initi = nfa.initialStates.includes(q)
      const final = nfa.finalStates.includes(q)

      if (initi && final) state.type = StateType.STATE_INITIAL_FINAL
      else if (final) state.type = StateType.STATE_FINAL
      else if (initi) state.type = StateType.STATE_INITIAL
      else state.type = StateType.STATE_NORMAL

      this.addState(state)
      state.display()

      return state
    })

    nfa.transitions.forEach(([q, a, p]) => {
      const sp = states[nfa.states.indexOf(p)]
      const sq = states[nfa.states.indexOf(q)]
      if (sp && sq) {
        this.addTransition(new Transition(sq, sp, a))
      }
    })
  }

  public apply(
    f: (nfa: NFA) => NFA | void,
    element: HTMLElement,
    applyEmpty = false,
  ) {
    if (!applyEmpty && this.states.length == 0) {
      setTimeout(() => element.classList.remove('error'), 500)
      element.classList.add('error')
      return
    }

    const start = this.toNFA()
    const res = f(start)

    if (res) {
      res.normalize()
      this.fromNFA(res)
    } else {
      setTimeout(() => element.classList.remove('error'), 500)
      element.classList.add('error')
    }

    this.saveSystem.save()
  }

  public clearAll(save = true) {
    this.states.forEach((s) => s.destroy())
    this.states = []

    this.transitions.forEach((s) => s.destroy())
    this.transitions = []

    this.creationTransition?.destroy()
    this.creationTransition = null
    this.startingState = null
    if (save) this.saveSystem.save()
  }


  // Get Typst's finite representation
  public asCode(): string {
    let out = ''

    out += '\t#cetz.canvas({\n'
    out += '\t\timport finite.draw: state, transition\n'
    out += '\t\timport cetz.draw: set-style\n\n'

    out += '\t\tset-style(stroke: theme.text)\n\n'

    for(const q of this.states) {
      const [x,y] = [q.x(), q.y()].map(l => Math.round(l / 70))
      const label = "$ q_(" + q.stateID + ") $"
      switch(q.type) {
        case StateType.STATE_NORMAL:
          out += `\t\tstate((${x},${y}), "q${q.stateID}", label: ${label})\n`
          break

        case StateType.STATE_FINAL:
          out += `\t\tstate((${x},${y}), "q${q.stateID}", label: ${label}, final: true)\n`
          break

        case StateType.STATE_INITIAL:
          out += `\t\tstate((${x},${y}), "q${q.stateID}", label: ${label}, initial: true)\n`
          break

        case StateType.STATE_INITIAL_FINAL:
          out += `\\ttstate((${x},${y}), "q${q.stateID}", label: ${label}, final: true, initial: true)\n`
          break
      }
    }

    out += '\t\n'

    for(const t of this.transitions) {
      const p = t.startState.stateID
      const q = t.endState.stateID
      const a = unstyleText(t.text)
      out += `\t\ttransition("q${p}", "q${q}", inputs: ("${a}"))\n`
    }

    out += '\t})\n'

    return out.replace(/\t/gm, "  ")
  }
}

export default Automaton
