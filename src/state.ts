import Konva from 'konva'
import { StyleMode, styleText } from './math_style'
import Transition from './transition'
import Automaton, { ControlMode, MenuMode } from './automaton'
import { KonvaEventObject } from 'konva/lib/Node'

export const defaultStateRadius = 30

export const defaultStateStyle: Konva.CircleConfig = {
  radius: defaultStateRadius,
  fill: '#fffaf3',
  stroke: '#575279',
  strokeWidth: 2,
  hitStrokeWidth: 50,
}

export const defaultStateLabelStyle: Konva.TextConfig = {
  fontSize: 30,
  fill: '#575279',
  width: 2 * defaultStateRadius,
  height: 2 * defaultStateRadius,
  align: 'center',
  verticalAlign: 'center',
  x: -defaultStateRadius,
  y: -defaultStateRadius / 2,
  fontFamily: 'Latin Modern Math',
  hitStrokeWidth: 50,
}

export enum StateType {
  STATE_NORMAL,
  STATE_FINAL,
  STATE_INITIAL,
  STATE_INITIAL_FINAL,
}

export class State extends Konva.Group {
  public circle: Konva.Circle
  public circleFinal: Konva.Circle
  public label: Konva.Text
  public transitions: Transition[] = []
  public automaton!: Automaton

  constructor(
    public stateID: number,
    public text: string,
    x: number,
    y: number,
    public type: StateType = StateType.STATE_NORMAL,
  ) {
    super({ x, y, draggable: true })

    this.circle = new Konva.Circle({ ...defaultStateStyle })
    this.circleFinal = new Konva.Circle({
      ...defaultStateStyle,
      radius: 1.2 * defaultStateRadius,
    })
    this.label = new Konva.Text({ text, ...defaultStateLabelStyle })

    this.styleText()
    this.display()

    this.add(this.circleFinal, this.circle, this.label)

    this.on('click', this.onClick)
    this.on('dragmove', () =>
      this.transitions.forEach((transition) => transition.adjust()),
    )
    this.on('dragend', () => this.automaton.saveSystem.save())

    this.on('contextmenu', (e) =>
      this.automaton.openMenu(e.evt, MenuMode.STATE, this),
    )
    this.on('pointerdblclick', (e) => (e.cancelBubble = true))
  }

  public rename() {}

  public makeFinal() {
    switch(this.type) {
      case StateType.STATE_NORMAL:
        this.type = StateType.STATE_FINAL
        break

      case StateType.STATE_FINAL:
        this.type = StateType.STATE_NORMAL
        break

      case StateType.STATE_INITIAL:
        this.type = StateType.STATE_INITIAL_FINAL
        break

      case StateType.STATE_INITIAL_FINAL:
        this.type = StateType.STATE_INITIAL
        break
    }

    this.display()
  }
  public makeInitial() {
    switch(this.type) {
      case StateType.STATE_NORMAL:
        this.type = StateType.STATE_INITIAL
        break

      case StateType.STATE_FINAL:
        this.type = StateType.STATE_INITIAL_FINAL
        break

      case StateType.STATE_INITIAL:
        this.type = StateType.STATE_NORMAL
        break

      case StateType.STATE_INITIAL_FINAL:
        this.type = StateType.STATE_FINAL
        break
    }

    this.display()
  }

  public removeElement() {
    this.automaton.states = this.automaton.states.filter(
      (s) => s.stateID != this.stateID,
    )
    this.transitions.forEach((t) => t.removeElement())
    this.destroy()
    this.automaton.saveSystem.save()
  }

  public onClick(evt: KonvaEventObject<MouseEvent>): void {
    if (evt.evt.button != 0) return

    if (this.automaton.mode == ControlMode.ADD_STATES) {
      evt.cancelBubble = true

      switch (this.type) {
        default:
        case StateType.STATE_NORMAL:
          this.type = StateType.STATE_INITIAL
          break

        case StateType.STATE_INITIAL:
          this.type = StateType.STATE_FINAL
          break

        case StateType.STATE_FINAL:
          this.type = StateType.STATE_INITIAL_FINAL
          break

        case StateType.STATE_INITIAL_FINAL:
          this.type = StateType.STATE_NORMAL
          break
      }

      this.display()
      this.automaton.saveSystem.save()
    } else if (this.automaton.mode == ControlMode.ADD_TRANSITIONS) {
      evt.cancelBubble = true

      if (this.automaton.startingState == null) {
        this.automaton.startingState = this
        this.automaton.creationTransition = new Transition(
          this,
          this.automaton.followMouseState,
          '',
          false,
        )
        this.automaton.transitionLayer.add(this.automaton.creationTransition)
      } else {
        let text = prompt('Label ?', 'a')
        if (!text) return

        this.automaton.creationTransition?.remove()
        this.automaton.creationTransition = null

        const t = new Transition(
          this.automaton.startingState,
          this,
          styleText(text, StyleMode.TYPEWRITTER),
        )

        this.automaton.addTransition(t)
        this.automaton.startingState = null
        this.automaton.saveSystem.save()
      }
    }
  }

  public radius(): number {
    switch (this.type) {
      case StateType.STATE_INITIAL_FINAL:
        return this.circleFinal.radius() + 2
      case StateType.STATE_FINAL:
        return this.circleFinal.radius()
      case StateType.STATE_INITIAL:
        return this.circle.radius() + 2
      case StateType.STATE_NORMAL:
        return this.circle.radius()
    }
  }

  public display(): void {
    switch (this.type) {
      case StateType.STATE_FINAL:
        this.circleFinal.opacity(1)
        this.circleFinal.strokeWidth(2)
        this.circle.strokeWidth(2)
        break
      case StateType.STATE_INITIAL:
        this.circleFinal.opacity(0)
        this.circleFinal.strokeWidth(2)
        this.circle.strokeWidth(4)
        break
      case StateType.STATE_INITIAL_FINAL:
        this.circleFinal.opacity(1)
        this.circleFinal.strokeWidth(4)
        this.circle.strokeWidth(4)
        break
      case StateType.STATE_NORMAL:
        this.circleFinal.opacity(0)
        this.circleFinal.strokeWidth(2)
        this.circle.strokeWidth(2)
        break
    }

    this.transitions.map((t) => t.adjust())
  }

  public styleText(): void {
    this.label.text(styleText(this.label.text()))
  }

  public addTransition(transition: Transition): void {
    if (!this.transitions.includes(transition))
      this.transitions.push(transition)
  }
}

export default State
