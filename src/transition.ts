import Konva from 'konva'
import State from './state'
import { MenuMode } from './automaton'
import { StyleMode, styleText, unstyleText } from './math_style'

export const defaultTransitionLabelStyle: Partial<Konva.TextConfig> = {
  align: 'center',
  verticalAlign: 'center',
  fontSize: 20,
  fontFamily: 'Latin Modern Math',
  fill: '#575279',
  hitStrokeWidth: 50,
}

export const defaultTransitionStyle: Partial<Konva.ArrowConfig> = {
  fill: '#575279',
  stroke: '#575279',
  lineCap: 'round',
  lineJoin: 'round',
  hitStrokeWidth: 50,
}

export const defaultLabelOffset = 20

export class Transition extends Konva.Group {
  public arrow: Konva.Arrow
  public label: Konva.Text
  public connectingTension: number = -0.5
  public selfTension: number = 0.9

  constructor(
    public startState: State,
    public endState: State,
    public text: string,
    public hasMenu: boolean = true,
  ) {
    super({})
    this.drawHit()

    if (hasMenu)
      this.on('contextmenu', (e) =>
        startState.automaton.openMenu(e.evt, MenuMode.LABEL, this),
      )
    
    const x = startState.x()
    const y = startState.y()

    const dx = endState.x() - x
    const dy = endState.y() - y

    this.arrow = new Konva.Arrow({
      x,
      y,
      points: [0, 0, dx, dy],
      ...defaultTransitionStyle,
    })

    this.label = new Konva.Text({
      text,
      x: x + dx / 2,
      y: y + dy / 2,
      ...defaultTransitionLabelStyle,
    })

    this.add(this.arrow, this.label)

    this.adjust()
  }

  public makeFinal() {}
  public makeInitial() {}

  public rename() {
    const oldLabel = unstyleText(this.text)
    const input = prompt('Rename transition ?', oldLabel)

    if(!input) return;

    const newLabel = styleText(input, StyleMode.TYPEWRITTER)
    this.label.text(newLabel)
    this.text = newLabel

    this.startState.automaton.saveSystem.save()
  }

  public removeElement() {
    this.startState.automaton.transitions =
      this.startState.automaton.transitions.filter((t) => t != this)
    this.startState.transitions = this.startState.transitions.filter(
      (t) => t != this,
    )
    this.endState.transitions = this.endState.transitions.filter(
      (t) => t != this,
    )
    this.remove()

    this.startState.automaton.saveSystem.save()
  }

  public adjust(): void {
    try {
      const x = this.startState.x()
      const y = this.startState.y()

      const dx = this.endState.x() - x
      const dy = this.endState.y() - y

      const dl = Math.sqrt(dx * dx + dy * dy)

      if (dl == 0) {
        const angle = Math.PI
        const angleIn = angle + (Math.PI * 40) / 180
        const angleOut = angle - (Math.PI * 40) / 180

        const r = this.startState.radius()

        const adjustX1 = Math.cos(angleIn) * r
        const adjustY1 = Math.sin(angleIn) * r

        const adjustX2 = Math.cos(angleOut) * r
        const adjustY2 = Math.sin(angleOut) * r

        const adjustedX = x + adjustX1
        const adjustedY = y + adjustY1

        const adjustedDx = dx - adjustX2 - adjustX1
        const adjustedDy = dy - adjustY2 - adjustY1

        this.arrow.x(adjustedX)
        this.arrow.y(adjustedY)

        const cosAngle = Math.cos(angle)
        const sinAngle = Math.sin(angle)

        const curve = 60
        const sign = Math.sign(this.selfTension)
        this.arrow.tension(Math.abs(this.selfTension))
        const curveOffsetX = -sinAngle * curve * sign
        const curveOffsetY = +cosAngle * curve * sign

        this.arrow.points([
          0,
          0,
          adjustedDx / 2 + curveOffsetX,
          adjustedDy / 2 + curveOffsetY,
          adjustedDx,
          adjustedDy,
        ])

        const labelOffsetX =
          -sinAngle * defaultLabelOffset * sign + curveOffsetX
        const labelOffsetY = cosAngle * defaultLabelOffset * sign + curveOffsetY

        this.label.x(adjustedX + adjustedDx / 2 + labelOffsetX)
        this.label.y(adjustedY + adjustedDy / 2 + labelOffsetY)
      } else {
        const cosAngle = dx / dl
        const sinAngle = dy / dl

        const startR = this.startState.radius()
        const endR = this.endState.radius()

        const adjustX1 = cosAngle * startR
        const adjustY1 = sinAngle * startR

        const adjustX2 = cosAngle * endR
        const adjustY2 = sinAngle * endR

        const adjustedX = x + adjustX1
        const adjustedY = y + adjustY1

        this.arrow.x(adjustedX)
        this.arrow.y(adjustedY)

        const adjustedDx = dx - adjustX2 - adjustX1
        const adjustedDy = dy - adjustY2 - adjustY1

        const curve = dl / 8
        const sign = Math.sign(this.connectingTension)
        this.arrow.tension(Math.abs(this.connectingTension))
        const curveOffsetX = +sinAngle * curve * sign
        const curveOffsetY = -cosAngle * curve * sign

        this.arrow.points([
          0,
          0,
          adjustedDx / 2 + curveOffsetX,
          adjustedDy / 2 + curveOffsetY,
          adjustedDx,
          adjustedDy,
        ])

        const labelOffsetX =
          +sinAngle * defaultLabelOffset * sign + curveOffsetX
        const labelOffsetY =
          -cosAngle * defaultLabelOffset * sign + curveOffsetY

        this.label.x(adjustedX + adjustedDx / 2 + labelOffsetX)
        this.label.y(adjustedY + adjustedDy / 2 + labelOffsetY)
      }
    } catch {}
  }
}

export default Transition
