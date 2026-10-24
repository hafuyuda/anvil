/* eslint-disable */
/* ---------------------------------------------------------------------------
 * GENERATED FILE — DO NOT EDIT.
 * 由 scripts/build-reader-runtime.mjs 从 src/features/story/engine/index.ts
 * 打包生成，内联进导出的 HTML。改语义请改 TS 源，然后 `pnpm build:runtime`。
 * --------------------------------------------------------------------------- */
var AnvilReader = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/features/story/script/eval.ts
	var TWO_CHAR_OPS = [
		"==",
		"!=",
		"<=",
		">=",
		"&&",
		"||"
	];
	function tokenize(src) {
		const tokens = [];
		let i = 0;
		while (i < src.length) {
			const ch = src[i];
			if (ch === " " || ch === "	") {
				i++;
				continue;
			}
			if (ch === "(" || ch === ")") {
				tokens.push({
					t: "paren",
					v: ch
				});
				i++;
				continue;
			}
			if (/[0-9]/.test(ch)) {
				let j = i + 1;
				while (j < src.length && /[0-9.]/.test(src[j])) j++;
				tokens.push({
					t: "num",
					v: src.slice(i, j)
				});
				i = j;
				continue;
			}
			if (ch === "\"") {
				let j = i + 1;
				let s = "";
				while (j < src.length && src[j] !== "\"") if (src[j] === "\\" && j + 1 < src.length) {
					s += src[j + 1];
					j += 2;
				} else {
					s += src[j];
					j++;
				}
				if (j >= src.length) throw new Error("字符串未闭合");
				tokens.push({
					t: "str",
					v: s
				});
				i = j + 1;
				continue;
			}
			if (/[A-Za-z_]/.test(ch)) {
				let j = i + 1;
				while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
				tokens.push({
					t: "id",
					v: src.slice(i, j)
				});
				i = j;
				continue;
			}
			const two = src.slice(i, i + 2);
			if (TWO_CHAR_OPS.includes(two)) {
				tokens.push({
					t: "op",
					v: two
				});
				i += 2;
				continue;
			}
			if ("<>=!+".includes(ch)) {
				tokens.push({
					t: "op",
					v: ch
				});
				i++;
				continue;
			}
			throw new Error(`无法识别的字符：${ch}`);
		}
		return tokens;
	}
	/** 求值一个表达式。表达式无副作用，右值总是先求出。 */
	function evalExpr(expr, values, builtins) {
		const tokens = tokenize(expr);
		if (tokens.length === 0) throw new Error("空表达式");
		let pos = 0;
		function eatOp(...ops) {
			const t = tokens[pos];
			if (t && t.t === "op" && ops.includes(t.v)) {
				pos++;
				return t.v;
			}
			return null;
		}
		function expectParen(p) {
			const t = tokens[pos];
			if (!t || t.t !== "paren" || t.v !== p) throw new Error(`期望 ${p}`);
			pos++;
		}
		function parseOr() {
			let left = parseAnd();
			while (eatOp("||")) {
				const right = parseAnd();
				left = truthy(left) || truthy(right);
			}
			return left;
		}
		function parseAnd() {
			let left = parseEquality();
			while (eatOp("&&")) {
				const right = parseEquality();
				left = truthy(left) && truthy(right);
			}
			return left;
		}
		function parseEquality() {
			let left = parseComparison();
			let op;
			while (op = eatOp("==", "!=")) left = eq(left, parseComparison(), op);
			return left;
		}
		function parseComparison() {
			let left = parseAdditive();
			let op;
			while (op = eatOp("<", "<=", ">", ">=")) left = compare(left, parseAdditive(), op);
			return left;
		}
		function parseAdditive() {
			let left = parseUnary();
			while (eatOp("+")) left = add(left, parseUnary());
			return left;
		}
		function parseUnary() {
			if (eatOp("!")) return !truthy(parseUnary());
			return parsePrimary();
		}
		function parsePrimary() {
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
				return;
			}
			throw new Error(`意外的记号：${t.v}`);
		}
		const result = parseOr();
		if (pos !== tokens.length) throw new Error(`多余的内容：${tokens[pos].v}`);
		return result;
	}
	/** 条件行求值：结果按真值解释。 */
	function evalCondition(expr, values, builtins) {
		return truthy(evalExpr(expr, values, builtins));
	}
	function truthy(v) {
		if (typeof v === "boolean") return v;
		if (typeof v === "number") return v !== 0;
		if (typeof v === "string") return v !== "";
		return false;
	}
	function eq(a, b, op) {
		const result = a === b;
		return op === "==" ? result : !result;
	}
	function compare(a, b, op) {
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
	function add(a, b) {
		if (typeof a === "string" || typeof b === "string") return String(a) + String(b);
		const na = Number(a);
		const nb = Number(b);
		if (!Number.isNaN(na) && !Number.isNaN(nb)) return na + nb;
		return String(a) + String(b);
	}
	//#endregion
	//#region src/features/story/script/parser.ts
	/**
	* 解析 Markdown 剧本（weave 语法，16 种行）。
	*
	*   === 名             → knot（子 knot 用 `铁匠铺.夜`）
	*   VAR 名 = 字面量     → var
	*   > 文本             → narration
	*   **角色**（表情）：文本 → say
	*   *文本*             → action
	*   @bg / @bgm / @sfx  → bg / bgm / sfx
	*   @scene 卡名        → scene_ref（记入当前 knot）
	*   @actor 卡名        → actor_ref（记入当前 knot）
	*   -> 目标            → jump（目标 = knot 名 / END）
	*   * 选项文本         → choice
	*   - / - 文本         → gather
	*   {表达式: 文本}     → condition（整行，假时跳过）
	*   {表达式: A|B}      → 行内条件（text 保留原文，解析结果入 inline）
	*   ~ 变量 操作符 值    → assign（= += -=）
	*   <>（单独一行）      → glue
	*
	* 空行分隔，frontmatter 用 --- 包围。
	* 不认识的语法：当 narration 处理，不丢数据。
	*/
	function parseScript(source) {
		const lines = source.split(/\r?\n/);
		let i = 0;
		const frontmatter = {};
		if (lines[0]?.trim() === "---") {
			i = 1;
			while (i < lines.length && lines[i].trim() !== "---") {
				const m = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
				if (m) {
					const key = m[1];
					const raw = m[2].trim();
					if (key === "is_ending") frontmatter.is_ending = raw === "true";
					else if (key === "ending_name") frontmatter.ending_name = stripQuotes$1(raw);
					else if (key === "bg") frontmatter.bg = stripQuotes$1(raw);
					else if (key === "bgm") frontmatter.bgm = stripQuotes$1(raw);
				}
				i++;
			}
			if (i < lines.length) i++;
		}
		const scriptLines = [];
		const knots = {};
		const vars = [];
		let currentKnot = null;
		while (i < lines.length) {
			const line = lines[i].trim();
			if (line === "") {
				i++;
				continue;
			}
			const knot = line.match(/^===\s*(.+?)\s*$/);
			if (knot) {
				const k = {
					name: knot[1],
					pc: scriptLines.length,
					actors: []
				};
				knots[k.name] = k;
				currentKnot = k;
				scriptLines.push({
					type: "knot",
					name: k.name
				});
				i++;
				continue;
			}
			const varDecl = line.match(/^VAR\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
			if (varDecl) {
				vars.push({
					key: varDecl[1],
					literal: varDecl[2].trim()
				});
				scriptLines.push({
					type: "var",
					key: varDecl[1],
					literal: varDecl[2].trim()
				});
				i++;
				continue;
			}
			if (line === "<>") {
				scriptLines.push({ type: "glue" });
				i++;
				continue;
			}
			const jump = line.match(/^->\s*(.+)$/);
			if (jump) {
				scriptLines.push({
					type: "jump",
					target: jump[1].trim()
				});
				i++;
				continue;
			}
			const at = line.match(/^@(bg|bgm|sfx|scene|actor)(?:\s+(.*))?$/);
			if (at) {
				const kind = at[1];
				const value = (at[2] ?? "").trim();
				if (kind === "bg") scriptLines.push({
					type: "bg",
					image: value
				});
				else if (kind === "bgm" || kind === "sfx") scriptLines.push({
					type: kind,
					file: value
				});
				else if (kind === "scene") {
					if (currentKnot) currentKnot.scene = value;
					scriptLines.push({
						type: "scene_ref",
						cardName: value
					});
				} else {
					if (currentKnot) currentKnot.actors.push(value);
					scriptLines.push({
						type: "actor_ref",
						cardName: value
					});
				}
				i++;
				continue;
			}
			if (line.startsWith("> ") || line === ">") {
				const text = line.slice(1).trim();
				scriptLines.push(withInline({
					type: "narration",
					text
				}));
				i++;
				continue;
			}
			const say = line.match(/^\*\*([^*]*)\*\*(?:\s*[（(]([^）)]*)[）)])?\s*[:：]?\s*(.*)$/);
			if (say) {
				const speaker = say[1].trim();
				const portraitRaw = say[2]?.trim();
				const text = say[3] ?? "";
				scriptLines.push(withInline({
					type: "say",
					speaker,
					portrait: portraitRaw ? portraitRaw : void 0,
					text
				}));
				i++;
				continue;
			}
			if (line.startsWith("{") && line.endsWith("}")) {
				const inner = line.slice(1, -1);
				const inline = parseInlineInner(inner);
				if (inline) {
					scriptLines.push({
						type: "narration",
						text: line,
						inline: [inline]
					});
					i++;
					continue;
				}
				const cond = parseConditionBody(inner);
				if (cond) {
					scriptLines.push({
						type: "condition",
						expr: cond.expr,
						text: cond.text
					});
					i++;
					continue;
				}
			}
			const assign = line.match(/^~\s*(\S+?)\s*(\+=|-=|=)\s*(.+)$/);
			if (assign) {
				scriptLines.push({
					type: "assign",
					key: assign[1],
					op: assign[2],
					value: assign[3].trim()
				});
				i++;
				continue;
			}
			if (line === "*") {
				scriptLines.push({
					type: "choice",
					label: ""
				});
				i++;
				continue;
			}
			const choice = line.match(/^\*\s+(.*)$/);
			if (choice) {
				scriptLines.push({
					type: "choice",
					label: choice[1].trim()
				});
				i++;
				continue;
			}
			const action = line.match(/^\*(.*)\*$/);
			if (action) {
				scriptLines.push(withInline({
					type: "action",
					text: action[1].trim()
				}));
				i++;
				continue;
			}
			const gather = line.match(/^-(?:\s+(.*))?$/);
			if (gather) {
				scriptLines.push({
					type: "gather",
					text: (gather[1] ?? "").trim()
				});
				i++;
				continue;
			}
			scriptLines.push(withInline({
				type: "narration",
				text: line,
				draft: true
			}));
			i++;
		}
		return {
			frontmatter,
			lines: scriptLines,
			knots,
			vars,
			choiceGroups: buildChoiceGroups(scriptLines)
		};
	}
	/**
	* choice 组：连续 `*` 行构成一组。每个选项的 body 是其后、
	* 下一个 `*` / `-`（gather）/ `===`（knot）/ EOF 之前的所有行。
	* gatherPc 是组后第一个 gather 行的 pc（没有则 null）。
	* key = 组内第一个 * 行的 pc。
	*/
	function buildChoiceGroups(lines) {
		const groups = {};
		let i = 0;
		while (i < lines.length) {
			if (lines[i].type !== "choice") {
				i++;
				continue;
			}
			const groupStart = i;
			const choices = [];
			let j = i;
			let terminated = false;
			while (j < lines.length && lines[j].type === "choice") {
				let k = j + 1;
				while (k < lines.length && lines[k].type !== "choice" && lines[k].type !== "gather" && lines[k].type !== "knot") k++;
				choices.push({
					label: choiceLabel(lines[j]),
					bodyStart: j + 1,
					bodyEnd: k - 1
				});
				if (k < lines.length && lines[k].type === "choice") {
					j = k;
					continue;
				}
				groups[groupStart] = {
					choices,
					gatherPc: k < lines.length && lines[k].type === "gather" ? k : null
				};
				j = k;
				terminated = true;
				break;
			}
			i = terminated ? j : i + 1;
		}
		return groups;
	}
	function choiceLabel(line) {
		return line.type === "choice" ? line.label : "";
	}
	/** 文本行行内条件扫描：text 保留原文，解析结果入 inline。 */
	function withInline(line) {
		if (line.type !== "narration" && line.type !== "say" && line.type !== "action") return line;
		const inline = scanInlineConds(line.text);
		return inline.length > 0 ? {
			...line,
			inline
		} : line;
	}
	/** 扫描文本中所有 `{expr: A|B}` 跨度（`|` 不在双引号内时才是分隔符）。 */
	function scanInlineConds(text) {
		const out = [];
		let i = 0;
		while (i < text.length) {
			const open = text.indexOf("{", i);
			if (open === -1) break;
			const close = text.indexOf("}", open + 1);
			if (close === -1) break;
			const cond = parseInlineInner(text.slice(open + 1, close));
			if (cond) out.push(cond);
			i = close + 1;
		}
		return out;
	}
	/** `{表达式: A|B}` 花括号内部分割。无 `|` 时返回 null（整行条件场景）。 */
	function parseInlineInner(inner) {
		let colon = -1;
		let inStr = false;
		for (let j = 0; j < inner.length; j++) {
			const ch = inner[j];
			if (ch === "\"") inStr = !inStr;
			else if (ch === ":" && !inStr) {
				colon = j;
				break;
			}
		}
		if (colon === -1) return null;
		const expr = inner.slice(0, colon).trim();
		if (!expr) return null;
		let pipe = -1;
		inStr = false;
		for (let j = colon + 1; j < inner.length; j++) {
			const ch = inner[j];
			if (ch === "\"") inStr = !inStr;
			else if (ch === "|" && !inStr) {
				pipe = j;
				break;
			}
		}
		if (pipe === -1) return null;
		return {
			expr,
			then: inner.slice(colon + 1, pipe).trim(),
			else: inner.slice(pipe + 1).trim()
		};
	}
	/**
	* 整行条件行内部分割：找第一个不在双引号内的冒号，
	* 前半是表达式，后半是显示文本（可空）。
	*/
	function parseConditionBody(inner) {
		let inStr = false;
		for (let j = 0; j < inner.length; j++) {
			const ch = inner[j];
			if (ch === "\"") inStr = !inStr;
			else if (ch === ":" && !inStr) {
				const expr = inner.slice(0, j).trim();
				if (!expr) return null;
				return {
					expr,
					text: inner.slice(j + 1).trim()
				};
			}
		}
		const expr = inner.trim();
		return expr ? {
			expr,
			text: ""
		} : null;
	}
	function stripQuotes$1(s) {
		if (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
		return s;
	}
	var TERM_RE = /^(\d*)d(%|\d+)(?:(kh|kl|dh|dl)(\d+))?$/i;
	var NUMBER_RE = /^\d+(\.\d+)?$/;
	function normalize(raw) {
		return raw.replace(/\s+/g, "").toLowerCase();
	}
	/**
	* 按顶层 +/- 切分成带符号的项。
	* 骰子项内部的取舍后缀（dl1 等）不含符号，不会误切。
	*/
	function splitTerms(src) {
		const parts = [];
		let sign = 1;
		let start = 0;
		let i = 0;
		if (src[0] === "+") {
			i = 1;
			start = 1;
		} else if (src[0] === "-") {
			sign = -1;
			i = 1;
			start = 1;
		}
		for (; i < src.length; i++) {
			const ch = src[i];
			if (ch !== "+" && ch !== "-") continue;
			parts.push({
				sign,
				text: src.slice(start, i)
			});
			sign = ch === "+" ? 1 : -1;
			start = i + 1;
		}
		parts.push({
			sign,
			text: src.slice(start)
		});
		return parts;
	}
	/**
	* 解析表达式。非法返回 null。
	* 解析与掷骰分离 —— 校验路径不产生随机数。
	*/
	function parseDiceExpression(raw) {
		const src = normalize(raw);
		if (!src) return null;
		const terms = [];
		for (const part of splitTerms(src)) {
			if (!part.text) return null;
			const m = part.text.match(TERM_RE);
			if (m) {
				const count = m[1] ? Number(m[1]) : 1;
				const percent = m[2] === "%";
				const face = percent ? 100 : Number(m[2]);
				const sel = m[3] ? m[3].toLowerCase() ?? null : null;
				const selCount = m[4] ? Number(m[4]) : 0;
				if (count < 1 || count > 100) return null;
				if (face < 2 || face > 1e3) return null;
				if (sel) {
					if (selCount < 1 || selCount > 100) return null;
					if (selCount > count) return null;
				}
				terms.push({
					sign: part.sign,
					kind: "dice",
					count,
					face,
					percent,
					sel,
					selCount,
					value: 0
				});
				continue;
			}
			if (NUMBER_RE.test(part.text)) {
				terms.push({
					sign: part.sign,
					kind: "number",
					count: 0,
					face: 0,
					percent: false,
					sel: null,
					selCount: 0,
					value: Number(part.text)
				});
				continue;
			}
			return null;
		}
		return terms.length > 0 ? terms : null;
	}
	function rollTerm(term) {
		if (term.kind === "number") return {
			kept: [],
			dropped: []
		};
		const raw = [];
		for (let i = 0; i < term.count; i++) raw.push(Math.floor(Math.random() * term.face) + 1);
		if (!term.sel) return {
			kept: raw,
			dropped: []
		};
		const desc = [...raw].sort((a, b) => b - a);
		const asc = [...raw].sort((a, b) => a - b);
		const n = term.selCount;
		switch (term.sel) {
			case "kh": return {
				kept: desc.slice(0, n),
				dropped: desc.slice(n)
			};
			case "kl": return {
				kept: asc.slice(0, n),
				dropped: asc.slice(n)
			};
			case "dh": return {
				kept: desc.slice(n),
				dropped: desc.slice(0, n)
			};
			case "dl": return {
				kept: asc.slice(n),
				dropped: asc.slice(0, n)
			};
		}
	}
	function formatTerm(term) {
		if (term.kind === "number") return String(term.value);
		if (term.percent && term.count === 1) return "d%";
		let s = `${term.count}d${term.percent ? "%" : term.face}`;
		if (term.sel) s += `${term.sel}${term.selCount}`;
		return s;
	}
	function formatExpr(terms) {
		let s = "";
		for (const term of terms) {
			const body = formatTerm(term);
			if (!s) s = term.sign === 1 ? body : `-${body}`;
			else s += term.sign === 1 ? `+${body}` : `-${body}`;
		}
		return s;
	}
	/** 解析表达式并掷骰。非法返回 null。 */
	function rollDice(raw) {
		const terms = parseDiceExpression(raw);
		if (!terms) return null;
		const detail = [];
		const dropped = [];
		let sum = 0;
		let natural = null;
		let isRoll = false;
		for (const term of terms) {
			if (term.kind === "number") {
				sum += term.sign * term.value;
				continue;
			}
			const rolled = rollTerm(term);
			const sub = rolled.kept.reduce((a, b) => a + b, 0);
			sum += term.sign * sub;
			detail.push(...rolled.kept);
			dropped.push(...rolled.dropped);
			if (!isRoll) natural = rolled.kept[0] ?? null;
			isRoll = true;
		}
		return {
			expr: formatExpr(terms),
			result: sum,
			detail,
			dropped,
			natural,
			isRoll
		};
	}
	/**
	* 只校验语法，不掷骰。合法返回规范化表达式，非法返回 null。
	* 用于编辑器实时校验，避免每次校验都产生随机数。
	*/
	function validateDiceExpression(raw) {
		const terms = parseDiceExpression(raw);
		if (!terms) return null;
		return formatExpr(terms);
	}
	//#endregion
	//#region src/features/story/effects.ts
	function parseLiteral(raw, ty) {
		switch (ty.kind) {
			case "bool": {
				const t = raw.toLowerCase();
				return {
					value: t === "true" || t === "1" || t === "是",
					detail: [],
					isRoll: false
				};
			}
			case "number": {
				const r = rollDice(raw);
				if (!r) return null;
				return {
					value: r.result,
					detail: r.detail,
					isRoll: r.isRoll
				};
			}
			default: {
				let v = raw;
				if (v.startsWith("\"") && v.endsWith("\"") || v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
				return {
					value: v,
					detail: [],
					isRoll: false
				};
			}
		}
	}
	function applyEffects(values, effects, variables) {
		const next = { ...values };
		const errors = [];
		const applied = [];
		for (const e of effects) {
			const def = variables.find((v) => v.key === e.key);
			if (!def) {
				errors.push(`未知变量：${e.key}`);
				continue;
			}
			const current = next[e.key];
			if (e.op === "=") {
				const parsed = parseLiteral(e.rawValue, def.ty);
				if (!parsed) {
					errors.push(`无法解析值：${e.rawValue}`);
					continue;
				}
				next[e.key] = parsed.value;
				applied.push({
					key: e.key,
					op: e.op,
					raw: e.raw,
					resolved: parsed.value,
					isRoll: parsed.isRoll,
					rollDetail: parsed.isRoll ? parsed.detail : void 0
				});
				continue;
			}
			if (def.ty.kind === "number") {
				const parsed = rollDice(e.rawValue);
				if (!parsed) {
					errors.push(`无法解析数值：${e.rawValue}`);
					continue;
				}
				const cur = typeof current === "number" ? current : 0;
				const nextVal = e.op === "+=" ? cur + parsed.result : cur - parsed.result;
				next[e.key] = nextVal;
				applied.push({
					key: e.key,
					op: e.op,
					raw: e.raw,
					resolved: parsed.result,
					isRoll: parsed.isRoll,
					rollDetail: parsed.isRoll ? parsed.detail : void 0
				});
			} else if (def.ty.kind === "bool") {
				const parsed = parseLiteral(e.rawValue, def.ty);
				if (!parsed) continue;
				next[e.key] = parsed.value;
				applied.push({
					key: e.key,
					op: e.op,
					raw: e.raw,
					resolved: parsed.value,
					isRoll: false
				});
			} else {
				const cur = typeof current === "string" ? current : "";
				const parsed = parseLiteral(e.rawValue, def.ty);
				if (!parsed) continue;
				const val = String(parsed.value);
				next[e.key] = e.op === "+=" ? cur + val : val;
				applied.push({
					key: e.key,
					op: e.op,
					raw: e.raw,
					resolved: val,
					isRoll: false
				});
			}
		}
		return {
			values: next,
			errors,
			applied
		};
	}
	//#endregion
	//#region src/features/story/engine/machine.ts
	/** 单次推进的步数上限，防死循环。 */
	var MAX_STEPS = 1e3;
	/**
	* 条件求值的容错包装：表达式语法错误按「假」处理，不中断播放。
	*
	* 语法校验归编辑器侧（validateXxx）负责，运行时只负责别停——作者的
	* 笔误不该让整个试玩崩掉。导出侧过去单独实现过一份 try/catch，现在
	* 与预览共用本函数。
	*/
	function safeEvalCondition(expr, values, visited) {
		try {
			return evalCondition(expr, values, visited);
		} catch {
			return false;
		}
	}
	/**
	* 跨文件 knot 索引。按文件名字典序构建（调用方保证 Map 插入顺序），
	* 重名 knot 后加载的覆盖先加载的，名字记入 duplicates 供调用方警告。
	*/
	function buildKnotIndex(files) {
		const knots = /* @__PURE__ */ new Map();
		const duplicates = [];
		for (const [filename, script] of files) for (const name of Object.keys(script.knots)) {
			if (knots.has(name)) duplicates.push(name);
			const k = script.knots[name];
			knots.set(name, {
				file: filename,
				pc: k.pc
			});
		}
		return {
			knots,
			duplicates
		};
	}
	/**
	* VAR 声明 → VariableDef。跨文件同名视为同一变量，首次声明生效。
	* 字面量推断：数字 → number、true/false → bool、其余 → text。
	*
	* 这是变量表类型的唯一推断实现：导出侧过去在 Rust 里另写了一份
	* （`parse_var_line` + `var_to_def`），已于 0.4.0 删除，改由导出 bundle
	* 内的本函数计算。
	*/
	function varsToVariables(vars) {
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		for (const v of vars) {
			if (seen.has(v.key)) continue;
			seen.add(v.key);
			out.push(varToDef(v));
		}
		return out;
	}
	function varToDef(v) {
		const lit = v.literal.trim();
		if (/^-?\d+(\.\d+)?$/.test(lit)) return {
			key: v.key,
			label: v.key,
			ty: { kind: "number" },
			default: Number(lit)
		};
		if (lit === "true" || lit === "false") return {
			key: v.key,
			label: v.key,
			ty: { kind: "bool" },
			default: lit === "true"
		};
		return {
			key: v.key,
			label: v.key,
			ty: { kind: "text" },
			default: stripQuotes(lit)
		};
	}
	function stripQuotes(s) {
		if (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
		return s;
	}
	/** 变量初始值：VariableDef.default（无 default 时 null）。 */
	function initValues(variables) {
		const init = {};
		for (const v of variables) init[v.key] = v.default ?? null;
		return init;
	}
	/**
	* 初始状态：file / knot / pc 指向入口 knot，visited 为空——
	* 入口 knot 的 visited 计数由首次 continueStep 扫到 knot 行时建立。
	*/
	function createInitialState(args) {
		return {
			file: args.file,
			knot: args.knot,
			pc: args.pc,
			values: initValues(args.variables),
			visited: {},
			displayLine: null,
			choices: [],
			currentChoiceGroupStart: null,
			choiceBodyEnd: null,
			gatherPc: null,
			bg: args.bg ?? null,
			bgm: args.bgm ?? null,
			glue: false,
			ended: false,
			portrait: null,
			sceneCard: null
		};
	}
	/**
	* 推进一步：从当前 pc 扫描指令行直到产生显示行 / 选项组 / 结束 / 错误。
	* 纯函数，不碰 IO。
	*/
	function continueStep(state, files, knots, variables) {
		let { file, knot, pc } = state;
		let { values, visited, displayLine, glue } = state;
		let { currentChoiceGroupStart, choiceBodyEnd, gatherPc } = state;
		let { bg, bgm } = state;
		let { portrait, sceneCard } = state;
		const sfx = [];
		const rolls = [];
		const snap = (overrides = {}) => ({
			file,
			knot,
			pc,
			values,
			visited,
			displayLine,
			choices: [],
			currentChoiceGroupStart,
			choiceBodyEnd,
			gatherPc,
			bg,
			bgm,
			glue,
			ended: false,
			portrait,
			sceneCard,
			...overrides
		});
		for (let i = 0; i < MAX_STEPS; i++) {
			if (choiceBodyEnd !== null && pc > choiceBodyEnd) {
				if (gatherPc !== null) {
					pc = gatherPc;
					choiceBodyEnd = null;
					gatherPc = null;
					currentChoiceGroupStart = null;
					continue;
				}
				choiceBodyEnd = null;
				gatherPc = null;
				currentChoiceGroupStart = null;
			}
			const script = file !== null ? files.get(file) : void 0;
			if (!script) return {
				state: null,
				sfx,
				rolls,
				error: `文件 ${file} 不存在`
			};
			const line = script.lines[pc];
			if (!line) return {
				state: snap({
					displayLine: null,
					currentChoiceGroupStart: null,
					choiceBodyEnd: null,
					gatherPc: null,
					ended: true
				}),
				sfx,
				rolls,
				error: null
			};
			switch (line.type) {
				case "knot": {
					visited = {
						...visited,
						[line.name]: (visited[line.name] ?? 0) + 1
					};
					knot = line.name;
					const knotScene = script.knots[line.name]?.scene ?? null;
					if (knotScene) sceneCard = knotScene;
					pc++;
					break;
				}
				case "var":
					pc++;
					break;
				case "assign": {
					const result = applyEffects(values, [toEffect(line)], variables);
					values = result.values;
					rolls.push(...result.applied.filter((a) => a.isRoll));
					pc++;
					break;
				}
				case "condition":
					if (safeEvalCondition(line.expr, values, visited) && line.text) {
						displayLine = mergeGlue(glue, displayLine, line);
						glue = false;
						return {
							state: snap({
								pc: pc + 1,
								displayLine,
								glue
							}),
							sfx,
							rolls,
							error: null
						};
					}
					pc++;
					break;
				case "glue":
					glue = true;
					pc++;
					break;
				case "bg":
					bg = line.image;
					pc++;
					break;
				case "bgm":
					bgm = line.file;
					pc++;
					break;
				case "sfx":
					sfx.push(line.file);
					pc++;
					break;
				case "scene_ref":
					sceneCard = line.cardName;
					pc++;
					break;
				case "actor_ref":
					pc++;
					break;
				case "jump": {
					if (line.target === "END") return {
						state: snap({
							displayLine: null,
							currentChoiceGroupStart: null,
							choiceBodyEnd: null,
							gatherPc: null,
							ended: true
						}),
						sfx,
						rolls,
						error: null
					};
					const target = knots.get(line.target);
					if (!target) return {
						state: null,
						sfx,
						rolls,
						error: `找不到 knot：${line.target}`
					};
					file = target.file;
					pc = target.pc;
					choiceBodyEnd = null;
					gatherPc = null;
					currentChoiceGroupStart = null;
					break;
				}
				case "choice": {
					const group = script.choiceGroups[pc];
					if (!group) {
						pc++;
						break;
					}
					return {
						state: snap({
							choices: group.choices.map((c, idx) => ({
								label: c.label,
								index: idx
							})),
							currentChoiceGroupStart: pc,
							choiceBodyEnd: null,
							gatherPc: null
						}),
						sfx,
						rolls,
						error: null
					};
				}
				case "gather":
					if (line.text) {
						displayLine = mergeGlue(glue, displayLine, line);
						glue = false;
						return {
							state: snap({
								pc: pc + 1,
								displayLine,
								glue,
								currentChoiceGroupStart: null,
								choiceBodyEnd: null,
								gatherPc: null
							}),
							sfx,
							rolls,
							error: null
						};
					}
					pc++;
					break;
				default: {
					const resolved = resolveInline(line, values, visited);
					const merged = mergeGlue(glue, displayLine, resolved);
					displayLine = merged;
					glue = false;
					if (merged.type === "say") portrait = {
						speaker: merged.speaker,
						emotion: merged.portrait
					};
					return {
						state: snap({
							pc: pc + 1,
							displayLine,
							glue
						}),
						sfx,
						rolls,
						error: null
					};
				}
			}
		}
		return {
			state: null,
			sfx,
			rolls,
			error: `剧本推进超过 ${MAX_STEPS} 步`
		};
	}
	/**
	* 选择一个选项：pc 落到该选项 body 起点，记录 body 终点与 gather 位置。
	* 只改 pc 与 choiceBodyEnd / gatherPc / currentChoiceGroupStart。
	*/
	function chooseStep(state, files, choiceIndex) {
		const script = state.file !== null ? files.get(state.file) : void 0;
		const group = script && state.currentChoiceGroupStart !== null ? script.choiceGroups[state.currentChoiceGroupStart] : void 0;
		const choice = group?.choices[choiceIndex];
		if (!group || !choice) return state;
		return {
			...state,
			pc: choice.bodyStart,
			choiceBodyEnd: choice.bodyEnd,
			gatherPc: group.gatherPc,
			choices: []
		};
	}
	/** 粘合：下一显示行与上一显示行拼接（换行连接，保留上一行的类型）。 */
	function mergeGlue(glue, prev, line) {
		if (glue && prev && "text" in prev && "text" in line) return {
			...prev,
			text: `${prev.text}\n${line.text}`
		};
		return line;
	}
	/**
	* 行内条件渲染前求值：按源码位置扫描 `{...}` 跨度，逐个求值替换。
	* 非条件跨度（如 `{术语}`）原样保留。
	*/
	function resolveInline(line, values, visited) {
		if (line.type !== "narration" && line.type !== "say" && line.type !== "action") return line;
		const inline = line.inline;
		if (!inline || inline.length === 0) return line;
		const text = line.text;
		let out = "";
		let i = 0;
		while (i < text.length) {
			const open = text.indexOf("{", i);
			if (open === -1) {
				out += text.slice(i);
				break;
			}
			const close = text.indexOf("}", open + 1);
			if (close === -1) {
				out += text.slice(i);
				break;
			}
			const cond = parseInlineInner(text.slice(open + 1, close));
			if (!cond) {
				out += text.slice(i, close + 1);
				i = close + 1;
				continue;
			}
			out += text.slice(i, open);
			out += String(safeEvalCondition(cond.expr, values, visited) ? cond.then : cond.else);
			i = close + 1;
		}
		const resolved = {
			...line,
			text: out
		};
		if ("inline" in resolved) delete resolved.inline;
		return resolved;
	}
	function toEffect(line) {
		return {
			key: line.key,
			op: line.op,
			rawValue: line.value,
			raw: `~ ${line.key} ${line.op} ${line.value}`
		};
	}
	//#endregion
	//#region src/features/story/engine/reader.ts
	/**
	* 文件解析结果按文件名字典序排列，重名 knot 后加载覆盖先加载 ——
	* 与预览侧 `usePlayState` 的加载顺序一致，不依赖 JSON 对象键序。
	*/
	function parseFiles(files) {
		const parsed = /* @__PURE__ */ new Map();
		for (const name of Object.keys(files).sort()) {
			const lines = files[name];
			parsed.set(name, parseScript(Array.isArray(lines) ? lines.join("\n") : ""));
		}
		return parsed;
	}
	function createReader(source) {
		const files = parseFiles(source.files ?? {});
		const { knots } = buildKnotIndex(files);
		const variables = varsToVariables([...files.values()].flatMap((f) => f.vars));
		const explicit = source.scenario?.entry_knot ?? null;
		const resolveEntry = () => {
			if (explicit) {
				const hit = knots.get(explicit);
				return hit ? {
					entry: {
						file: hit.file,
						knot: explicit,
						pc: hit.pc
					},
					error: null
				} : {
					entry: null,
					error: `找不到入口 knot：${explicit}`
				};
			}
			const firstFile = files.keys().next();
			if (!firstFile.done) {
				const script = files.get(firstFile.value);
				const firstKnot = script ? Object.keys(script.knots).sort()[0] : void 0;
				if (script && firstKnot) return {
					entry: {
						file: firstFile.value,
						knot: firstKnot,
						pc: script.knots[firstKnot].pc
					},
					error: null
				};
			}
			return {
				entry: null,
				error: "剧情没有可进入的 knot"
			};
		};
		const resolved = resolveEntry();
		const initialError = resolved.error;
		const buildInitial = () => {
			if (!resolved.entry) return null;
			const fm = files.get(resolved.entry.file)?.frontmatter ?? {};
			return createInitialState({
				file: resolved.entry.file,
				knot: resolved.entry.knot,
				pc: resolved.entry.pc,
				variables,
				bg: fm.bg ?? null,
				bgm: fm.bgm ?? null
			});
		};
		const reader = {
			variables,
			state: buildInitial(),
			initialError,
			reset() {
				const state = buildInitial();
				reader.state = state;
				return {
					state,
					error: state ? null : initialError
				};
			},
			continue() {
				if (!reader.state) return {
					state: null,
					sfx: [],
					rolls: [],
					error: initialError ?? "剧情尚未初始化"
				};
				const result = continueStep(reader.state, files, knots, variables);
				reader.state = result.state;
				return result;
			},
			choose(index) {
				if (!reader.state) return null;
				reader.state = chooseStep(reader.state, files, index);
				return reader.state;
			},
			frontmatter(file) {
				const target = file === void 0 ? reader.state?.file : file;
				if (!target) return {};
				return files.get(target)?.frontmatter ?? {};
			}
		};
		return reader;
	}
	//#endregion
	exports.MAX_STEPS = MAX_STEPS;
	exports.applyEffects = applyEffects;
	exports.buildKnotIndex = buildKnotIndex;
	exports.chooseStep = chooseStep;
	exports.continueStep = continueStep;
	exports.createInitialState = createInitialState;
	exports.createReader = createReader;
	exports.evalCondition = evalCondition;
	exports.evalExpr = evalExpr;
	exports.initValues = initValues;
	exports.mergeGlue = mergeGlue;
	exports.parseScript = parseScript;
	exports.rollDice = rollDice;
	exports.validateDiceExpression = validateDiceExpression;
	exports.varsToVariables = varsToVariables;
	return exports;
})({});
