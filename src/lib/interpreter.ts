/**
 * RishAlgo AI — JavaScript-subset interpreter with step recording.
 *
 * Ported to TypeScript from the AlgoLens v4 prototype's compiler layer.
 * Every statement and expression emits a Step, which is what powers the
 * visual debugger: line highlighting, variable watch, call stack and heap.
 *
 * Supported subset:
 *   numbers, strings, booleans, null, array literals
 *   let/const/var, if/else, while, for(;;), function, return, break, continue
 *   binary + - * / % == != < > <= >=, logical && ||, unary ! -
 *   assignment = += -= *= /=, update ++ --
 *   calls, member access (a.b), index access (a[i]), recursion
 *
 * Runtime values are intentionally `any`: this is a dynamic language runtime,
 * and modelling it in the type system would obscure rather than help.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Val = any;

// ─── Lexer ───────────────────────────────────────────────────────────

type TokType = "NUM" | "STR" | "IDENT" | "KW" | "OP" | "PUNCT" | "EOF";

interface Token {
  type: TokType;
  value: Val;
  line: number;
  col: number;
}

const KEYWORDS = new Set([
  "let", "const", "var", "if", "else", "while", "for",
  "function", "return", "true", "false", "null", "break", "continue",
  "new",
]);

const TWO_CHAR_OPS = ["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/="];

const ESCAPES: Record<string, string> = {
  n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'", '"': '"',
};

export function lex(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0, line = 1, col = 1;
  const peek = (o = 0) => src[i + o];
  const advance = () => {
    const c = src[i++];
    if (c === "\n") { line++; col = 1; } else col++;
    return c;
  };

  while (i < src.length) {
    const c = peek();
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { advance(); continue; }

    // Comments
    if (c === "/" && peek(1) === "/") {
      while (i < src.length && peek() !== "\n") advance();
      continue;
    }
    if (c === "/" && peek(1) === "*") {
      advance(); advance();
      while (i < src.length && !(peek() === "*" && peek(1) === "/")) advance();
      advance(); advance();
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c)) {
      let n = "";
      const sl = line, sc = col;
      while (i < src.length && /[0-9.]/.test(peek())) n += advance();
      tokens.push({ type: "NUM", value: parseFloat(n), line: sl, col: sc });
      continue;
    }

    // Strings
    if (c === '"' || c === "'") {
      const q = advance();
      let s = "";
      const sl = line, sc = col;
      while (i < src.length && peek() !== q) {
        if (peek() === "\\") { advance(); const e = advance(); s += ESCAPES[e] ?? e; }
        else s += advance();
      }
      advance();
      tokens.push({ type: "STR", value: s, line: sl, col: sc });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(c)) {
      let id = "";
      const sl = line, sc = col;
      while (i < src.length && /[a-zA-Z0-9_$]/.test(peek())) id += advance();
      tokens.push({ type: KEYWORDS.has(id) ? "KW" : "IDENT", value: id, line: sl, col: sc });
      continue;
    }

    const sl = line, sc = col;
    const two = c + (peek(1) ?? "");
    if (TWO_CHAR_OPS.includes(two)) {
      advance(); advance();
      tokens.push({ type: "OP", value: two, line: sl, col: sc });
      continue;
    }
    if ("+-*/%<>!=".includes(c)) {
      advance();
      tokens.push({ type: "OP", value: c, line: sl, col: sc });
      continue;
    }
    if ("(){}[],;.:".includes(c)) {
      advance();
      tokens.push({ type: "PUNCT", value: c, line: sl, col: sc });
      continue;
    }
    advance(); // skip unknown character
  }

  tokens.push({ type: "EOF", value: null, line, col });
  return tokens;
}

// ─── AST ─────────────────────────────────────────────────────────────

export interface Node {
  type: string;
  line: number;
  [k: string]: Val;
}

// ─── Parser (recursive descent) ──────────────────────────────────────

export class Parser {
  private t: Token[];
  private p = 0;

  constructor(tokens: Token[]) {
    this.t = tokens;
  }

  private peek(o = 0) { return this.t[this.p + o]; }
  private advance() { return this.t[this.p++]; }
  private check(type: TokType, value?: Val) {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  private match(type: TokType, value?: Val) {
    return this.check(type, value) ? this.advance() : null;
  }
  private expect(type: TokType, value?: Val, msg?: string) {
    if (this.check(type, value)) return this.advance();
    const t = this.peek();
    throw new SyntaxError(
      `${msg ?? `Expected ${type}${value ? ` '${value}'` : ""}`} at line ${t.line}, got ${t.type} '${t.value}'`,
    );
  }

  parse(): Node {
    const body: Node[] = [];
    while (!this.check("EOF")) body.push(this.statement());
    return { type: "Program", body, line: 0 };
  }

  private statement(): Node {
    const t = this.peek();
    if (t.type === "KW") {
      if (t.value === "let" || t.value === "const" || t.value === "var") return this.varDecl();
      if (t.value === "function") return this.funcDecl();
      if (t.value === "if") return this.ifStmt();
      if (t.value === "while") return this.whileStmt();
      if (t.value === "for") return this.forStmt();
      if (t.value === "return") return this.returnStmt();
      if (t.value === "break") {
        this.advance(); this.match("PUNCT", ";");
        return { type: "Break", line: t.line };
      }
      if (t.value === "continue") {
        this.advance(); this.match("PUNCT", ";");
        return { type: "Continue", line: t.line };
      }
    }
    if (this.check("PUNCT", "{")) return this.block();
    return this.exprStmt();
  }

  private block(): Node {
    const t = this.expect("PUNCT", "{");
    const body: Node[] = [];
    while (!this.check("PUNCT", "}") && !this.check("EOF")) body.push(this.statement());
    this.expect("PUNCT", "}");
    return { type: "Block", body, line: t.line };
  }

  private varDecl(): Node {
    const kw = this.advance();
    const name = this.expect("IDENT", undefined, "Expected variable name").value;
    let init: Node | null = null;
    if (this.match("OP", "=")) init = this.expression();
    this.match("PUNCT", ";");
    return { type: "VarDecl", kind: kw.value, name, init, line: kw.line };
  }

  private funcDecl(): Node {
    const t = this.advance();
    const name = this.expect("IDENT").value;
    this.expect("PUNCT", "(");
    const params: string[] = [];
    if (!this.check("PUNCT", ")")) {
      params.push(this.expect("IDENT").value);
      while (this.match("PUNCT", ",")) params.push(this.expect("IDENT").value);
    }
    this.expect("PUNCT", ")");
    const body = this.block();
    return { type: "FuncDecl", name, params, body, line: t.line };
  }

  private ifStmt(): Node {
    const t = this.advance();
    this.expect("PUNCT", "(");
    const test = this.expression();
    this.expect("PUNCT", ")");
    const consequent = this.statement();
    let alternate: Node | null = null;
    if (this.match("KW", "else")) alternate = this.statement();
    return { type: "If", test, consequent, alternate, line: t.line };
  }

  private whileStmt(): Node {
    const t = this.advance();
    this.expect("PUNCT", "(");
    const test = this.expression();
    this.expect("PUNCT", ")");
    const body = this.statement();
    return { type: "While", test, body, line: t.line };
  }

  private forStmt(): Node {
    const t = this.advance();
    this.expect("PUNCT", "(");

    // `for (const x of iterable)` — detected by lookahead past the binding name.
    const nt = this.peek();
    if (nt.type === "KW" && ["let", "var", "const"].includes(nt.value)) {
      const after = this.peek(1);
      const ofTok = this.peek(2);
      if (after?.type === "IDENT" && ofTok?.type === "IDENT" && ofTok.value === "of") {
        this.advance();                       // let / const / var
        const name = this.advance().value;    // binding
        this.advance();                       // of
        const iterable = this.expression();
        this.expect("PUNCT", ")");
        const body = this.statement();
        return { type: "ForOf", name, iterable, body, line: t.line };
      }
    }

    let init: Node | null = null;
    if (!this.check("PUNCT", ";")) {
      init = nt.type === "KW" && ["let", "var", "const"].includes(nt.value)
        ? this.varDecl()
        : this.exprStmt();
    } else this.advance();

    let test: Node | null = null;
    if (!this.check("PUNCT", ";")) test = this.expression();
    this.expect("PUNCT", ";");

    let update: Node | null = null;
    if (!this.check("PUNCT", ")")) update = this.expression();
    this.expect("PUNCT", ")");

    const body = this.statement();
    return { type: "For", init, test, update, body, line: t.line };
  }

  private returnStmt(): Node {
    const t = this.advance();
    let argument: Node | null = null;
    if (!this.check("PUNCT", ";") && !this.check("PUNCT", "}")) argument = this.expression();
    this.match("PUNCT", ";");
    return { type: "Return", argument, line: t.line };
  }

  private exprStmt(): Node {
    const e = this.expression();
    this.match("PUNCT", ";");
    return { type: "ExprStmt", expression: e, line: e.line };
  }

  private expression(): Node { return this.assignment(); }

  private assignment(): Node {
    const left = this.logicOr();
    for (const op of ["=", "+=", "-=", "*=", "/="]) {
      if (this.check("OP", op)) {
        this.advance();
        const value = this.assignment();
        return { type: "Assign", op, target: left, value, line: left.line };
      }
    }
    return left;
  }

  private binaryLevel(ops: string[], next: () => Node, nodeType: string): Node {
    let l = next();
    for (;;) {
      const hit = ops.find((op) => this.check("OP", op));
      if (!hit) return l;
      this.advance();
      const right = next();
      l = { type: nodeType, op: hit, left: l, right, line: l.line };
    }
  }

  private logicOr() { return this.binaryLevel(["||"], () => this.logicAnd(), "Logic"); }
  private logicAnd() { return this.binaryLevel(["&&"], () => this.equality(), "Logic"); }
  private equality() { return this.binaryLevel(["==", "!="], () => this.comparison(), "Binary"); }
  private comparison() { return this.binaryLevel(["<", ">", "<=", ">="], () => this.term(), "Binary"); }
  private term() { return this.binaryLevel(["+", "-"], () => this.factor(), "Binary"); }
  private factor() { return this.binaryLevel(["*", "/", "%"], () => this.unary(), "Binary"); }

  private unary(): Node {
    if (this.check("OP", "!") || this.check("OP", "-")) {
      const op = this.advance().value;
      const argument = this.unary();
      return { type: "Unary", op, argument, line: argument.line };
    }
    if (this.check("KW", "new")) {
      const t = this.advance();
      const ctor = this.expect("IDENT", undefined, "Expected a constructor name").value;
      const args: Node[] = [];
      if (this.match("PUNCT", "(")) {
        if (!this.check("PUNCT", ")")) {
          args.push(this.expression());
          while (this.match("PUNCT", ",")) args.push(this.expression());
        }
        this.expect("PUNCT", ")");
      }
      // Allow chaining off the instance, e.g. new Map().set(k, v)
      return this.callTail({ type: "New", ctor, args, line: t.line });
    }
    return this.postfix();
  }

  private postfix(): Node {
    let e = this.call();
    while (this.check("OP", "++") || this.check("OP", "--")) {
      const op = this.advance().value;
      e = { type: "UpdateExpr", op, argument: e, prefix: false, line: e.line };
    }
    return e;
  }

  private call(): Node {
    return this.callTail(this.primary());
  }

  /** Applies any trailing (), [] or . accessors to an already-parsed expression. */
  private callTail(start: Node): Node {
    let e = start;
    for (;;) {
      if (this.match("PUNCT", "(")) {
        const args: Node[] = [];
        if (!this.check("PUNCT", ")")) {
          args.push(this.expression());
          while (this.match("PUNCT", ",")) args.push(this.expression());
        }
        this.expect("PUNCT", ")");
        e = { type: "Call", callee: e, args, line: e.line };
      } else if (this.match("PUNCT", "[")) {
        const index = this.expression();
        this.expect("PUNCT", "]");
        e = { type: "Index", object: e, index, line: e.line };
      } else if (this.match("PUNCT", ".")) {
        const property = this.expect("IDENT").value;
        e = { type: "Member", object: e, property, line: e.line };
      } else return e;
    }
  }

  private primary(): Node {
    const t = this.peek();
    if (this.match("NUM")) return { type: "Lit", value: t.value, line: t.line };
    if (this.match("STR")) return { type: "Lit", value: t.value, line: t.line };
    if (this.match("KW", "true")) return { type: "Lit", value: true, line: t.line };
    if (this.match("KW", "false")) return { type: "Lit", value: false, line: t.line };
    if (this.match("KW", "null")) return { type: "Lit", value: null, line: t.line };
    if (this.match("IDENT")) return { type: "Ident", name: t.value, line: t.line };
    if (this.match("PUNCT", "(")) {
      const e = this.expression();
      this.expect("PUNCT", ")");
      return e;
    }
    if (this.match("PUNCT", "[")) {
      const elements: Node[] = [];
      if (!this.check("PUNCT", "]")) {
        elements.push(this.expression());
        while (this.match("PUNCT", ",")) elements.push(this.expression());
      }
      this.expect("PUNCT", "]");
      return { type: "Array", elements, line: t.line };
    }
    // Object literal. Statements check for '{' before reaching here, so a brace
    // in expression position is unambiguous.
    if (this.match("PUNCT", "{")) {
      const props: { key: string; value: Node }[] = [];
      while (!this.check("PUNCT", "}") && !this.check("EOF")) {
        const k = this.peek();
        if (k.type !== "IDENT" && k.type !== "STR" && k.type !== "NUM" && k.type !== "KW") {
          throw new SyntaxError(`Expected a property name at line ${k.line}, got '${k.value}'`);
        }
        this.advance();
        this.expect("PUNCT", ":");
        props.push({ key: String(k.value), value: this.expression() });
        if (!this.match("PUNCT", ",")) break;
      }
      this.expect("PUNCT", "}");
      return { type: "Object", props, line: t.line };
    }
    throw new SyntaxError(`Unexpected token ${t.type} '${t.value}' at line ${t.line}`);
  }
}

// ─── Runtime ─────────────────────────────────────────────────────────

export type StepKind =
  | "enter-frame" | "exit-frame" | "var-decl" | "assign" | "array-write"
  | "binop" | "if-test" | "loop-iter" | "return" | "heap-alloc"
  | "done" | "error";

export interface Frame {
  name: string;
  line: number;
  vars: Record<string, Val>;
}

export interface Step {
  t: StepKind;
  line: number;
  msg: string;
  name?: string;
  value?: Val;
  result?: Val;
  returnValue?: Val;
  op?: string;
  left?: Val;
  right?: Val;
  idx?: number;
  ref?: number;
  iter?: number;
  kind?: string;
  depth?: number;
  args?: Val[];
  frame?: string;
  vars?: Record<string, Val>;
  stack?: Frame[];
  heap?: Record<number, Val>;
  /** Cumulative counters — drive the live complexity graph. */
  ops: number;
  comparisons: number;
  writes: number;
}

class Environment {
  parent: Environment | null;
  vars: Record<string, Val> = {};
  name: string;
  depth: number;

  constructor(parent: Environment | null = null, name = "global") {
    this.parent = parent;
    this.name = name;
    this.depth = parent ? parent.depth + 1 : 0;
  }

  define(name: string, val: Val) { this.vars[name] = val; }

  get(name: string): Val {
    if (name in this.vars) return this.vars[name];
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`'${name}' is not defined`);
  }

  set(name: string, val: Val) {
    if (name in this.vars) { this.vars[name] = val; return; }
    if (this.parent) { this.parent.set(name, val); return; }
    throw new ReferenceError(`Cannot assign to undefined '${name}'`);
  }
}

class ReturnSignal { constructor(public value: Val) {} }
class BreakSignal {}
class ContinueSignal {}

interface RunFrame {
  name: string;
  env: Environment;
  line: number;
  args?: Val[];
}

export interface RunResult {
  steps: Step[];
  output: string[];
  error: string | null;
}

const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);

export class Interpreter {
  steps: Step[] = [];
  output: string[] = [];
  maxSteps: number;

  private heap = new Map<number, Val>();
  private heapNext = 1;
  private stack: RunFrame[] = [];
  /** Innermost environment currently executing — drives the watch panel. */
  private currentEnv: Environment | null = null;
  private ops = 0;
  private comparisons = 0;
  private writes = 0;

  private builtins: Record<string, Val> = {
    print: (...a: Val[]) => { this.output.push(a.map((x) => fmt(x)).join(" ")); return null; },
    len: (a: Val) => (Array.isArray(a) || typeof a === "string" ? a.length : 0),
    push: (arr: Val, v: Val) => { if (Array.isArray(arr)) arr.push(v); return arr; },
    pop: (arr: Val) => (Array.isArray(arr) ? arr.pop() : null),
    max: (...a: number[]) => Math.max(...a),
    min: (...a: number[]) => Math.min(...a),
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    sqrt: Math.sqrt,
  };

  constructor(maxSteps = 8000) {
    this.maxSteps = maxSteps;
  }

  private emit(s: Omit<Step, "ops" | "comparisons" | "writes">) {
    if (this.steps.length >= this.maxSteps) {
      throw new Error(`Step budget of ${this.maxSteps} exceeded — possible infinite loop`);
    }
    this.ops++;
    this.steps.push({ ...s, ops: this.ops, comparisons: this.comparisons, writes: this.writes });
  }

  run(ast: Node): RunResult {
    this.steps = [];
    this.output = [];
    this.heap = new Map();
    this.heapNext = 1;
    this.ops = this.comparisons = this.writes = 0;

    const global = new Environment(null, "global");
    for (const k in this.builtins) global.define(k, this.builtins[k]);
    this.stack = [{ name: "global", env: global, line: 0 }];

    this.emit({
      t: "enter-frame", name: "global", vars: {}, depth: 0,
      stack: this.stackSnap(), line: 0, msg: "Program start",
    });

    // Hoist function declarations so mutual recursion works.
    for (const stmt of ast.body as Node[]) {
      if (stmt.type === "FuncDecl") {
        global.define(stmt.name, {
          __fn: true, params: stmt.params, body: stmt.body, closure: global, name: stmt.name,
        });
      }
    }

    let error: string | null = null;
    try {
      for (const stmt of ast.body as Node[]) {
        if (stmt.type !== "FuncDecl") this.exec(stmt, global);
      }
    } catch (e) {
      if (!(e instanceof ReturnSignal)) {
        error = e instanceof Error ? e.message : String(e);
        this.steps.push({
          t: "error", msg: `Runtime error: ${error}`, line: this.stack.at(-1)?.line ?? 0,
          ops: this.ops, comparisons: this.comparisons, writes: this.writes,
        });
      }
    }

    this.steps.push({
      t: "done", msg: "Program complete", line: 0, stack: this.stackSnap(),
      ops: this.ops, comparisons: this.comparisons, writes: this.writes,
    });

    return { steps: this.steps, output: this.output, error };
  }

  /**
   * The innermost frame is snapshotted across its whole scope chain, so
   * block-scoped variables (`const seen` inside a function body, a loop's
   * `let i`) are visible in the watch panel instead of being hidden in a
   * child environment.
   */
  private stackSnap(): Frame[] {
    return this.stack.map((f, i) => ({
      name: f.name,
      line: f.line,
      vars:
        i === this.stack.length - 1 && this.currentEnv
          ? varsChain(this.currentEnv, f.env)
          : varsSnap(f.env),
    }));
  }

  private heapSnap(): Record<number, Val> {
    const r: Record<number, Val> = {};
    for (const [k, v] of this.heap) r[k] = Array.isArray(v) ? [...v] : v;
    return r;
  }

  private exec(node: Node | null, env: Environment): void {
    if (!node) return;
    this.currentEnv = env;
    const top = this.stack[this.stack.length - 1];
    if (top && node.line) top.line = node.line;

    switch (node.type) {
      case "VarDecl": {
        const v = node.init ? this.evaluate(node.init, env) : undefined;
        env.define(node.name, v);
        this.emit({
          t: "var-decl", name: node.name, value: v, kind: node.kind, line: node.line,
          frame: top.name, vars: varsSnap(env), stack: this.stackSnap(),
          msg: `${node.kind} ${node.name} = ${fmt(v)}`,
        });
        return;
      }

      case "FuncDecl":
        env.define(node.name, {
          __fn: true, params: node.params, body: node.body, closure: env, name: node.name,
        });
        return;

      case "Block": {
        const inner = new Environment(env, env.name);
        for (const s of node.body as Node[]) this.exec(s, inner);
        return;
      }

      case "If": {
        const t = this.evaluate(node.test, env);
        this.emit({
          t: "if-test", value: t, line: node.line,
          msg: `if (${fmt(t)}) → ${t ? "then" : "else"}`, stack: this.stackSnap(),
        });
        if (t) this.exec(node.consequent, env);
        else if (node.alternate) this.exec(node.alternate, env);
        return;
      }

      case "While": {
        let i = 0;
        while (this.evaluate(node.test, env)) {
          this.emit({
            t: "loop-iter", kind: "while", iter: i++, line: node.line,
            msg: `while iteration ${i}`, stack: this.stackSnap(),
          });
          try {
            this.exec(node.body, env);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        return;
      }

      case "For": {
        const inner = new Environment(env, env.name);
        if (node.init) {
          if (node.init.type === "VarDecl") this.exec(node.init, inner);
          else this.evaluate(node.init.expression ?? node.init, inner);
        }
        let i = 0;
        while (!node.test || this.evaluate(node.test, inner)) {
          this.emit({
            t: "loop-iter", kind: "for", iter: i++, line: node.line,
            msg: `for iteration ${i}`, stack: this.stackSnap(),
          });
          try {
            this.exec(node.body, inner);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (!(e instanceof ContinueSignal)) throw e;
          }
          if (node.update) this.evaluate(node.update, inner);
        }
        return;
      }

      case "ForOf": {
        const iterable = this.evaluate(node.iterable, env);
        const items: Val[] =
          typeof iterable === "string" ? [...iterable]
          : Array.isArray(iterable) ? iterable
          : iterable instanceof Set ? [...iterable]
          : iterable instanceof Map ? [...iterable]
          : [];
        let n = 0;
        for (const item of items) {
          const inner = new Environment(env, env.name);
          inner.define(node.name, item);
          this.emit({
            t: "loop-iter", kind: "for-of", iter: n++, line: node.line,
            msg: `for…of → ${node.name} = ${fmt(item)}`,
            vars: varsSnap(inner), stack: this.stackSnap(),
          });
          try {
            this.exec(node.body, inner);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (!(e instanceof ContinueSignal)) throw e;
          }
        }
        return;
      }

      case "Return": {
        const v = node.argument ? this.evaluate(node.argument, env) : undefined;
        this.emit({
          t: "return", value: v, line: node.line,
          msg: `return ${fmt(v)}`, stack: this.stackSnap(),
        });
        throw new ReturnSignal(v);
      }

      case "Break": throw new BreakSignal();
      case "Continue": throw new ContinueSignal();
      case "ExprStmt": this.evaluate(node.expression, env); return;
    }
  }

  private evaluate(node: Node | null, env: Environment): Val {
    if (!node) return undefined;
    this.currentEnv = env;
    const top = this.stack[this.stack.length - 1];
    if (top && node.line) top.line = node.line;

    switch (node.type) {
      case "Lit": return node.value;

      case "Array": {
        const arr = (node.elements as Node[]).map((e) => this.evaluate(e, env));
        const ref = this.heapNext++;
        this.heap.set(ref, arr);
        this.emit({
          t: "heap-alloc", ref, value: [...arr], line: node.line,
          msg: `Allocate array #${ref}, size ${arr.length}`, heap: this.heapSnap(),
        });
        return arr;
      }

      case "Object": {
        const obj: Record<string, Val> = {};
        for (const p of node.props as { key: string; value: Node }[]) {
          obj[p.key] = this.evaluate(p.value, env);
        }
        this.emit({
          t: "heap-alloc", line: node.line,
          msg: `Allocate object {${Object.keys(obj).join(", ")}}`,
          value: { ...obj }, stack: this.stackSnap(),
        });
        return obj;
      }

      case "New": {
        const args = (node.args as Node[]).map((a) => this.evaluate(a, env));
        let instance: Val;
        switch (node.ctor) {
          case "Map": instance = new Map(args[0] ?? []); break;
          case "Set": instance = new Set(args[0] ?? []); break;
          case "Array":
            instance = args.length === 1 && typeof args[0] === "number"
              ? new Array(args[0]).fill(undefined)
              : [...args];
            break;
          default:
            throw new Error(`'new ${node.ctor}' is not supported by the step debugger (try Map, Set or Array)`);
        }
        this.emit({
          t: "heap-alloc", line: node.line,
          msg: `new ${node.ctor}()`, value: fmt(instance), stack: this.stackSnap(),
        });
        return instance;
      }

      case "Ident": return env.get(node.name);

      case "Binary": {
        const l = this.evaluate(node.left, env);
        const r = this.evaluate(node.right, env);
        if (COMPARISON_OPS.has(node.op)) this.comparisons++;
        let v: Val;
        switch (node.op) {
          case "+": v = l + r; break;
          case "-": v = l - r; break;
          case "*": v = l * r; break;
          case "/": v = l / r; break;
          case "%": v = l % r; break;
          case "==": v = l == r; break;
          case "!=": v = l != r; break;
          case "<": v = l < r; break;
          case ">": v = l > r; break;
          case "<=": v = l <= r; break;
          case ">=": v = l >= r; break;
        }
        this.emit({
          t: "binop", op: node.op, left: l, right: r, result: v, line: node.line,
          msg: `${fmt(l)} ${node.op} ${fmt(r)} = ${fmt(v)}`, stack: this.stackSnap(),
        });
        return v;
      }

      case "Logic": {
        const l = this.evaluate(node.left, env);
        if (node.op === "&&" && !l) return l;
        if (node.op === "||" && l) return l;
        return this.evaluate(node.right, env);
      }

      case "Unary": {
        const a = this.evaluate(node.argument, env);
        return node.op === "!" ? !a : -a;
      }

      case "Assign": {
        const v = this.evaluate(node.value, env);
        if (node.target.type === "Ident") {
          let cur = node.op === "=" ? v : env.get(node.target.name);
          if (node.op === "+=") cur = cur + v;
          else if (node.op === "-=") cur = cur - v;
          else if (node.op === "*=") cur = cur * v;
          else if (node.op === "/=") cur = cur / v;
          env.set(node.target.name, cur);
          this.writes++;
          this.emit({
            t: "assign", name: node.target.name, value: cur, line: node.line,
            msg: `${node.target.name} = ${fmt(cur)}`, frame: top.name,
            vars: varsSnap(env), stack: this.stackSnap(),
          });
          return cur;
        }
        if (node.target.type === "Index") {
          const obj = this.evaluate(node.target.object, env);
          const idx = this.evaluate(node.target.index, env);
          let cur = v;
          if (node.op !== "=") {
            const old = obj?.[idx];
            cur = node.op === "+=" ? old + v : node.op === "-=" ? old - v
              : node.op === "*=" ? old * v : old / v;
          }
          if (obj instanceof Map) obj.set(idx, cur);
          else obj[idx] = cur;
          this.writes++;
          this.emit({
            t: "array-write", idx, value: cur, line: node.line,
            msg: `[${fmt(idx)}] = ${fmt(cur)}`, stack: this.stackSnap(), heap: this.heapSnap(),
          });
          return cur;
        }
        if (node.target.type === "Member") {
          const obj = this.evaluate(node.target.object, env);
          const prop = node.target.property;
          let cur = v;
          if (node.op !== "=") {
            const old = obj?.[prop];
            cur = node.op === "+=" ? old + v : node.op === "-=" ? old - v
              : node.op === "*=" ? old * v : old / v;
          }
          if (obj && typeof obj === "object") obj[prop] = cur;
          this.writes++;
          this.emit({
            t: "assign", name: prop, value: cur, line: node.line,
            msg: `.${prop} = ${fmt(cur)}`, stack: this.stackSnap(),
          });
          return cur;
        }
        return v;
      }

      case "UpdateExpr": {
        if (node.argument.type === "Ident") {
          const cur = env.get(node.argument.name);
          const next = node.op === "++" ? cur + 1 : cur - 1;
          env.set(node.argument.name, next);
          this.writes++;
          this.emit({
            t: "assign", name: node.argument.name, value: next, line: node.line,
            msg: `${node.argument.name}${node.op} → ${next}`, frame: top.name,
            vars: varsSnap(env), stack: this.stackSnap(),
          });
          return cur;
        }
        return null;
      }

      case "Index": {
        const obj = this.evaluate(node.object, env);
        const idx = this.evaluate(node.index, env);
        return obj?.[idx];
      }

      case "Member": {
        const obj = this.evaluate(node.object, env);
        if (node.property === "length") return obj?.length;
        if (node.property === "size" && (obj instanceof Map || obj instanceof Set)) return obj.size;
        return obj?.[node.property];
      }

      case "Call": {
        // Method calls must keep their receiver, so `map.set(...)` works.
        if (node.callee.type === "Member") {
          const recv = this.evaluate(node.callee.object, env);
          const name = node.callee.property as string;
          const args = (node.args as Node[]).map((a) => this.evaluate(a, env));
          const method = recv?.[name];
          if (typeof method !== "function") {
            throw new TypeError(`'${name}' is not a method on ${fmt(recv)}`);
          }
          const before = recv instanceof Map || recv instanceof Set ? recv.size : recv?.length;
          const result = method.apply(recv, args);
          const after = recv instanceof Map || recv instanceof Set ? recv.size : recv?.length;
          if (before !== after) this.writes++;
          this.emit({
            t: before !== after ? "array-write" : "binop",
            line: node.line,
            value: result,
            msg: `.${name}(${args.map((a) => fmt(a)).join(", ")}) → ${fmt(result)}`,
            stack: this.stackSnap(),
            heap: this.heapSnap(),
          });
          return result;
        }

        const callee = this.evaluate(node.callee, env);
        const args = (node.args as Node[]).map((a) => this.evaluate(a, env));

        if (typeof callee === "function") return callee(...args);

        if (callee && callee.__fn) {
          if (this.stack.length > 180) throw new RangeError("Maximum call stack depth exceeded");
          const frameEnv = new Environment(callee.closure, callee.name);
          callee.params.forEach((p: string, i: number) => frameEnv.define(p, args[i]));
          this.stack.push({ name: callee.name, env: frameEnv, line: node.line, args });
          this.emit({
            t: "enter-frame", name: callee.name, vars: varsSnap(frameEnv),
            depth: this.stack.length - 1, stack: this.stackSnap(), line: node.line, args,
            msg: `Call ${callee.name}(${args.map((a) => fmt(a)).join(", ")})`,
          });

          let result: Val;
          try {
            this.exec(callee.body, frameEnv);
          } catch (e) {
            if (e instanceof ReturnSignal) result = e.value;
            else throw e;
          }

          this.stack.pop();
          this.currentEnv = env; // back to the caller's scope
          this.emit({
            t: "exit-frame", name: callee.name, returnValue: result, line: node.line,
            stack: this.stackSnap(), msg: `Return from ${callee.name} → ${fmt(result)}`,
          });
          return result;
        }
        return null;
      }
    }
    return undefined;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function fmt(v: Val): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  if (Array.isArray(v)) {
    return `[${v.slice(0, 6).map((x) => fmt(x)).join(", ")}${v.length > 6 ? ", …" : ""}]`;
  }
  if (v instanceof Map) {
    const entries = [...v.entries()].slice(0, 5).map(([k, val]) => `${fmt(k)} → ${fmt(val)}`);
    return `Map(${v.size}) {${entries.join(", ")}${v.size > 5 ? ", …" : ""}}`;
  }
  if (v instanceof Set) {
    const items = [...v].slice(0, 6).map((x) => fmt(x));
    return `Set(${v.size}) {${items.join(", ")}${v.size > 6 ? ", …" : ""}}`;
  }
  if (typeof v === "function") return "<builtin>";
  if (typeof v === "object") {
    if (v.__fn) return `<fn ${v.name}>`;
    const keys = Object.keys(v);
    const shown = keys.slice(0, 4).map((k) => `${k}: ${fmt(v[k])}`);
    return `{${shown.join(", ")}${keys.length > 4 ? ", …" : ""}}`;
  }
  return String(v);
}

/** Deep-ish copy so a later mutation can't rewrite an earlier recorded step. */
function snapValue(v: Val): Val {
  if (Array.isArray(v)) return [...v];
  if (v instanceof Map) return new Map(v);
  if (v instanceof Set) return new Set(v);
  if (v && typeof v === "object" && !v.__fn) return { ...v };
  return v;
}

/** Merges every scope from `from` up to `until`, inner shadowing outer. */
function varsChain(from: Environment, until: Environment): Record<string, Val> {
  const chain: Environment[] = [];
  let e: Environment | null = from;
  while (e) {
    chain.push(e);
    if (e === until) break;
    e = e.parent;
  }
  const out: Record<string, Val> = {};
  for (const env of chain.reverse()) Object.assign(out, varsSnap(env));
  return out;
}

function varsSnap(env: Environment): Record<string, Val> {
  const r: Record<string, Val> = {};
  for (const k in env.vars) {
    const v = env.vars[k];
    if (typeof v === "function") continue; // hide builtins from the watch panel
    if (v && typeof v === "object" && v.__fn) r[k] = { _fn: v.name };
    else r[k] = snapValue(v);
  }
  return r;
}

/**
 * A solution file is only a function declaration, so running it as a program
 * executes nothing. Appending a call with real arguments is what makes the
 * step debugger show anything at all.
 */
export function buildEntrySource(code: string, fn: string, args: unknown[]): string {
  const literals = args.map((a) => JSON.stringify(a)).join(", ");
  return `${code.trimEnd()}\n\n${fn}(${literals});\n`;
}

/** Lex → parse → run, capturing every step. Never throws: errors land in `error`. */
export function compileAndRun(source: string, maxSteps = 8000): RunResult & { ast: Node | null } {
  try {
    const ast = new Parser(lex(source)).parse();
    const result = new Interpreter(maxSteps).run(ast);
    return { ast, ...result };
  } catch (e) {
    return {
      ast: null,
      steps: [],
      output: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
