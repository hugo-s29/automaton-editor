# Automaton editor.

This project is a finite automaton editor. You can draw the automaton, make it deterministic (_i.e._ transform it from an NFA to a DFA), reduce the number of states, _etc_.

This project is based on the Konva rendering library (with Typescript). A PEG.JS parser is used to parse regular expressions.

Detailed documentation is available (in French) on the [website](http://167.99.84.84/soutien/automaton-editor/).

## How to run this project.

Run the following commands to compile the project.
```bash
npm install
npm run build

# or

yarn
yarn build
```

## How to recompile the parser.

After the dependencies were installed, run the following command to recompile the parser.
```bash
npm run compile-parser

# or

yarn compile-parser
```

## Motivation for this project.

This project was part of the [tutoring work](http://167.99.84.84/soutien/) I do at Clemenceau High School (Nantes, France).
It was made as a tool for students to learn about automatons and the operations that can be applied to them.

