{
	function alter(left, right) {
		return { op: 'alternative', left, right };
	}

	function concat(left, right) {
		return { op: 'concatenation', left, right };
	}

	function star(expr) {
		return { op: 'star', expr };
	}
}

start
	= alternative

alternative
	= left:concatenation "|" right:alternative { return alter(left, right); }
	/ concatenation

concatenation
	= left:star right:concatenation { return concat(left, right); }
	/ star

star
	= expr:primary "*" { return star(expr); }
	/ primary

primary
	= char
	/ "(" expr: alternative ")" { return expr; }

char "char"
	= chr:[a-zA-Z0-9&] { return chr; }
