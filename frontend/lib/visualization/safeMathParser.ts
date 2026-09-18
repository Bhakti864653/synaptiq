// A tiny, deliberately-restricted recursive-descent parser/evaluator for
// real mathematical expressions extracted from a material's own text -
// never `eval`/`Function`, and never any construct outside this fixed
// grammar. Supports: numbers, the variables x/y, + - * / ^, unary minus,
// parentheses, sin/cos/tan/sqrt/abs, and the constant pi. Anything outside
// this grammar fails to parse, which is the intended, safe outcome (falls
// back to the constellation rather than guessing).

type Token =
  | { type: "num"; value: number }
  | { type: "var"; name: "x" | "y" }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "func"; name: "sin" | "cos" | "tan" | "sqrt" | "abs" }
  | { type: "const"; name: "pi" };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.toLowerCase().replace(/\s+/g, "");
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const value = Number(s.slice(i, j));
      if (Number.isNaN(value)) return null;
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/.test(s[j])) j++;
      const word = s.slice(i, j);
      if (word === "sin" || word === "cos" || word === "tan" || word === "sqrt" || word === "abs") {
        tokens.push({ type: "func", name: word });
      } else if (word === "pi") {
        tokens.push({ type: "const", name: "pi" });
      } else if (word === "x" || word === "y") {
        tokens.push({ type: "var", name: word });
      } else {
        return null; // unknown identifier - refuse rather than guess
      }
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^") {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    return null; // any other character makes this unsafe/unparseable
  }
  return tokens;
}

type Node =
  | { type: "num"; value: number }
  | { type: "var"; name: "x" | "y" }
  | { type: "const"; name: "pi" }
  | { type: "unary"; op: "-"; arg: Node }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "call"; name: "sin" | "cos" | "tan" | "sqrt" | "abs"; arg: Node };

class Parser {
  tokens: Token[];
  pos = 0;
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  peek() {
    return this.tokens[this.pos];
  }
  next() {
    return this.tokens[this.pos++];
  }
  parseExpression(): Node | null {
    let left = this.parseTerm();
    if (!left) return null;
    while (this.peek() && this.peek().type === "op" && (this.peek() as { value: string }).value.match(/[+-]/)) {
      const op = (this.next() as { value: "+" | "-" }).value;
      const right = this.parseTerm();
      if (!right) return null;
      left = { type: "binary", op, left, right };
    }
    return left;
  }
  parseTerm(): Node | null {
    let left = this.parsePower();
    if (!left) return null;
    while (this.peek() && this.peek().type === "op" && (this.peek() as { value: string }).value.match(/[*/]/)) {
      const op = (this.next() as { value: "*" | "/" }).value;
      const right = this.parsePower();
      if (!right) return null;
      left = { type: "binary", op, left, right };
    }
    return left;
  }
  parsePower(): Node | null {
    const base = this.parseUnary();
    if (!base) return null;
    if (this.peek() && this.peek().type === "op" && (this.peek() as { value: string }).value === "^") {
      this.next();
      const exponent = this.parsePower();
      if (!exponent) return null;
      return { type: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }
  parseUnary(): Node | null {
    if (this.peek() && this.peek().type === "op" && (this.peek() as { value: string }).value === "-") {
      this.next();
      const arg = this.parseUnary();
      if (!arg) return null;
      return { type: "unary", op: "-", arg };
    }
    return this.parseAtom();
  }
  parseAtom(): Node | null {
    const tok = this.peek();
    if (!tok) return null;
    if (tok.type === "num") {
      this.next();
      return { type: "num", value: tok.value };
    }
    if (tok.type === "var") {
      this.next();
      return { type: "var", name: tok.name };
    }
    if (tok.type === "const") {
      this.next();
      return { type: "const", name: tok.name };
    }
    if (tok.type === "func") {
      this.next();
      if (!this.peek() || this.peek().type !== "lparen") return null;
      this.next();
      const arg = this.parseExpression();
      if (!arg) return null;
      if (!this.peek() || this.peek().type !== "rparen") return null;
      this.next();
      return { type: "call", name: tok.name, arg };
    }
    if (tok.type === "lparen") {
      this.next();
      const inner = this.parseExpression();
      if (!inner) return null;
      if (!this.peek() || this.peek().type !== "rparen") return null;
      this.next();
      return inner;
    }
    return null;
  }
}

export type ParsedEquation = {
  raw: string;
  node: Node;
  usesY: boolean;
};

// Parses `expr` (the right-hand side only, e.g. "x^2 - 3*x + 2") and
// returns null on anything unsupported - never throws, never partially
// evaluates something unsafe.
export function parseSafeExpression(expr: string): ParsedEquation | null {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;
  const parser = new Parser(tokens);
  const node = parser.parseExpression();
  if (!node || parser.pos !== tokens.length) return null;
  return { raw: expr, node, usesY: usesVariable(node, "y") };
}

function usesVariable(node: Node, name: "x" | "y"): boolean {
  switch (node.type) {
    case "var":
      return node.name === name;
    case "num":
    case "const":
      return false;
    case "unary":
      return usesVariable(node.arg, name);
    case "call":
      return usesVariable(node.arg, name);
    case "binary":
      return usesVariable(node.left, name) || usesVariable(node.right, name);
  }
}

export function evaluateSafeExpression(node: Node, x: number, y: number): number {
  switch (node.type) {
    case "num":
      return node.value;
    case "var":
      return node.name === "x" ? x : y;
    case "const":
      return Math.PI;
    case "unary":
      return -evaluateSafeExpression(node.arg, x, y);
    case "call": {
      const v = evaluateSafeExpression(node.arg, x, y);
      switch (node.name) {
        case "sin":
          return Math.sin(v);
        case "cos":
          return Math.cos(v);
        case "tan":
          return Math.tan(v);
        case "sqrt":
          return Math.sqrt(Math.abs(v));
        case "abs":
          return Math.abs(v);
      }
      break;
    }
    case "binary": {
      const l = evaluateSafeExpression(node.left, x, y);
      const r = evaluateSafeExpression(node.right, x, y);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return r === 0 ? 0 : l / r;
        case "^":
          return Math.pow(l, r);
      }
    }
  }
  return 0;
}
