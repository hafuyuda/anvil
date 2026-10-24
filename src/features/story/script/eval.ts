/**
 * 条件表达式本地求值器（递归下降，不走 IPC）。
 *
 * 运算符：== != < <= > >= && || ! +
 * 字面量：数字 / 双引号字符串 / true false
 * 标识符：从 values 读取，未定义按 undefined（falsy）处理
 *
 * 语法错误抛 Error，由调用方捕获后 toast。
 */

interface Token {
  t: "num" | "str" | "id" | "op" | "paren";
  v: string;
}

const TWO_CHAR_OPS = ["==", "!=", "<=", ">=", "&&", "||"];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ t: "paren", v: ch });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: "num", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && j + 1 < src.length) {
          s += src[j + 1];
          j += 2;
        } else {
          s += src[j];
          j++;
        }
      }
      if (j >= src.length) throw new Error("字符串未闭合");
      tokens.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("<>=!+".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new Error(`无法识别的字符：${ch}`);
  }
  return tokens;
}

/** 求值一个表达式。表达式无副作用，右值总是先求出。 */
export function evalExpr(
  expr: string,
  values: Record<string, unknown>,
  builtins?: Record<string, unknown>,
): unknown {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error("空表达式");
  let pos = 0;

  function eatOp(...ops: string[]): string | null {
    const t = tokens[pos];
    if (t && t.t === "op" && ops.includes(t.v)) {
      pos++;
      return t.v;
    }
    return null;
  }

  function expectParen(p: string): void {
    const t = tokens[pos];
    if (!t || t.t !== "paren" || t.v !== p) throw new Error(`期望 ${p}`);
    pos++;
  }

  // or → and → equality → comparison → additive → unary → primary
  function parseOr(): unknown {
    let left = parseAnd();
    while (eatOp("||")) {
      // 右操作数必须先解析完再合并：写成 `truthy(left) || truthy(parseAnd())`
      // 会在 left 为真时短路掉解析，游标停在 ) 之前，随后报「期望 )」。
      const right = parseAnd();
      left = truthy(left) || truthy(right);
    }
    return left;
  }

  function parseAnd(): unknown {
    let left = parseEquality();
    while (eatOp("&&")) {
      const right = parseEquality();
      left = truthy(left) && truthy(right);
    }
    return left;
  }

  function parseEquality(): unknown {
    let left = parseComparison();
    let op: string | null;
    while ((op = eatOp("==", "!="))) {
      left = eq(left, parseComparison(), op);
    }
    return left;
  }

  function parseComparison(): unknown {
    let left = parseAdditive();
    let op: string | null;
    while ((op = eatOp("<", "<=", ">", ">="))) {
      left = compare(left, parseAdditive(), op);
    }
    return left;
  }

  function parseAdditive(): unknown {
    let left = parseUnary();
    while (eatOp("+")) {
      left = add(left, parseUnary());
    }
    return left;
  }

  function parseUnary(): unknown {
    if (eatOp("!")) return !truthy(parseUnary());
    return parsePrimary();
  }

  function parsePrimary(): unknown {
    const t = tokens[pos];
    if (!t) throw new Error("表达式意外结束");
    if (t.t === "paren" && t.v === "(") {
      pos++;
      const v = parseOr();
      expectParen(")");
      return v;
    }
    if (t.t === "num") {
      pos++;
      return Number(t.v);
    }
    if (t.t === "str") {
      pos++;
      return t.v;
    }
    if (t.t === "id") {
      pos++;
      if (t.v === "true") return true;
      if (t.v === "false") return false;
      if (t.v in values) return values[t.v];
      if (builtins && t.v in builtins) return builtins[t.v];
      return undefined;
    }
    throw new Error(`意外的记号：${t.v}`);
  }

  const result = parseOr();
  if (pos !== tokens.length) throw new Error(`多余的内容：${tokens[pos].v}`);
  return result;
}

/** 条件行求值：结果按真值解释。 */
export function evalCondition(
  expr: string,
  values: Record<string, unknown>,
  builtins?: Record<string, unknown>,
): boolean {
  return truthy(evalExpr(expr, values, builtins));
}

function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v !== "";
  return false;
}

function eq(a: unknown, b: unknown, op: string): boolean {
  const result = a === b;
  return op === "==" ? result : !result;
}

function compare(a: unknown, b: unknown, op: string): boolean {
  const na = Number(a);
  const nb = Number(b);
  const bothNum = !Number.isNaN(na) && !Number.isNaN(nb);
  const sa = bothNum ? na : String(a);
  const sb = bothNum ? nb : String(b);
  if (op === "<") return sa < sb;
  if (op === "<=") return sa <= sb;
  if (op === ">") return sa > sb;
  return sa >= sb;
}

function add(a: unknown, b: unknown): unknown {
  if (typeof a === "string" || typeof b === "string") {
    return String(a) + String(b);
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na + nb;
  return String(a) + String(b);
}
