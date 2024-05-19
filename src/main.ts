import './style.css'
import Automaton, { ControlMode, MenuMode } from './automaton'
import Konva from 'konva'
import NFA, { toString } from './nfa'
import { parse } from './regexp.js'
import { EPS } from './utils.js'
import { StyleMode, styleText } from './math_style.js'

const gridLayer = new Konva.Layer()

const menu = Array.from(
  document.querySelectorAll<HTMLDivElement>('.context-menu')!,
)

const automaton = new Automaton(gridLayer, menu)

// @ts-ignore
window.automaton = automaton

type BtnFunc = (nfa: NFA) => NFA | void

function addButtonNFA(id: string, f: BtnFunc, applyEmpty = false): void {
  const elem = document.getElementById(id)
  if (!elem) return
  elem.addEventListener('click', () => automaton.apply(f, elem!, applyEmpty))
}

document
  .getElementById('btn-state')
  ?.addEventListener('click', () => (automaton.mode = ControlMode.ADD_STATES))
document
  .getElementById('btn-transition')
  ?.addEventListener(
    'click',
    () => (automaton.mode = ControlMode.ADD_TRANSITIONS),
  )
addButtonNFA('btn-rm-eps', (nfa) => nfa.removeEPS())
addButtonNFA('btn-det', (nfa) => nfa.reduce())
addButtonNFA('btn-comp', (nfa) => nfa.complete())
addButtonNFA(
  'btn-from-lang',
  () => {
    const input = prompt('RegExp ?')
    if (!input) return
    try {
      const regexp = parse(input.replace(/ /g, ''))
      return NFA.fromRegExp(regexp)
    } catch (e) {
      return
    }
  },
  true,
)

{
  const elem = document.getElementById('btn-in-lang')
  if (elem) {
    elem.addEventListener('click', () => {
      const w = prompt('Word ?')?.replace('&', EPS)
      const nfa = automaton.toNFA()
      const acc = w
        ? nfa.isAccepted(styleText(w, StyleMode.TYPEWRITTER))
        : false

      if (acc) {
        setTimeout(() => elem.classList.remove('success'), 500)
        elem.classList.add('success')
      } else {
        setTimeout(() => elem.classList.remove('error'), 500)
        elem.classList.add('error')
      }
    })
  }
}

const display = document.getElementById('display')!

document.getElementById('btn-get-lang')?.addEventListener('click', () => {
  const regexp = automaton.toNFA().toRegExp()
  const content = styleText(toString(regexp), StyleMode.TYPEWRITTER)

  display.innerHTML = `<span class="math">
    ℒ(𝒜) = ℒ(${content.replace(/\*/g, '<sup>⋆</sup>')})
  </span>`

  setTimeout(() => display.classList.remove('displaying'), 10000)
  display.classList.add('displaying')
})

document
  .getElementById('btn-clear')
  ?.addEventListener('click', () => automaton.clearAll())
document
  .getElementById('btn-del-state')
  ?.addEventListener('click', () => automaton.selected?.removeElement())
document
  .getElementById('btn-del-transition')
  ?.addEventListener('click', () => automaton.selected?.removeElement())
document
  .getElementById('btn-rename-label')
  ?.addEventListener('click', () => automaton.selected?.rename())
document
  .getElementById('btn-redo')
  ?.addEventListener('click', () => automaton.saveSystem.redo())
document
  .getElementById('btn-undo')
  ?.addEventListener('click', () => automaton.saveSystem.undo())
document
  .getElementById('btn-mk-init')
  ?.addEventListener('click', () => automaton.selected?.makeInitial())
document
  .getElementById('btn-mk-final')
  ?.addEventListener('click', () => automaton.selected?.makeFinal())

const stage = automaton.stage

const width = stage.width()
const height = stage.height()

const gridSize = 50
const gridColor = '#9893a5'

for (let x = -width + gridSize / 2; x < width * 2; x += gridSize) {
  for (let y = -height + gridSize / 2; y < height * 2; y += gridSize) {
    const rect = new Konva.Rect({
      x: x,
      y: y,
      width: gridSize,
      height: gridSize,
      stroke: gridColor,
      opacity: 0.2,
    })

    rect.on('contextmenu', (e) => automaton.openMenu(e.evt, MenuMode.NORMAL))

    gridLayer.add(rect)
  }
}

let scale = 1
let panX = 0
let panY = 0

stage.scaleX(scale)
stage.scaleY(scale)
stage.x(panX)
stage.y(panY)
stage.draw()

stage.on('wheel', (e) => {
  e.evt.preventDefault()

  if (e.evt.deltaY < 0) {
    scale *= 1.05
  } else {
    scale *= 0.95
  }

  const center = stage.getPointerPosition() || { x: 0, y: 0 }

  stage.scaleX(scale)
  stage.scaleY(scale)
  stage.x(center.x * (1 - scale))
  stage.y(center.y * (1 - scale))
  stage.batchDraw()
})

/*
{
  const reg = NFA.fromRegExp(parse('(a|b)*')).removeEPS().reduce().toRegExp()

  function show(r: RegExp): string {
    if(typeof r == 'string') {
      if (r == '&') return 'Epsilon'
      else return "'" + r + "'"
    } else {
      switch(r.op) {
        case 'concatenation':
          return `Concat(${show(r.left)},${show(r.right)})`
        case 'alternative':
          return `Union(${show(r.left)},${show(r.right)})`
        case 'star':
          return `Star(${show(r.expr)})`
      }
    }
  }

  console.log(show(reg))
}*/

function shuffle<T>(array: T[]): T[] {
  array = [...array]
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function randomDet() {
  const randint = (min: number, max: number) =>
    Math.round(Math.random() * (max - min) + min)

  const states = new Array(randint(4, 6)).fill(0).map((_, i) => i)
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    .substring(0, randint(2, 4))
    .split('')
  const transitions: [number, string, number][] = []

  for (const p of shuffle(states)) {
    for (const q of shuffle(states)) {
      for (const a of alphabet) {
        if (
          Math.random() <
          (1 * Math.abs(p - q)) / (states.length * transitions.length)
        )
          transitions.push([q, styleText(a, StyleMode.TYPEWRITTER), p])
      }
    }
  }

  const initial = shuffle(states).slice(0, randint(1, 3))
  const final = shuffle(states).slice(0, randint(1, 4))

  let nfa = new NFA(states, alphabet, initial, final, transitions)

  if(nfa.isDFA()) nfa = randomDet()

  automaton.fromNFA(nfa)

  return nfa
}

window.onload = randomDet

window.randomDet = randomDet
