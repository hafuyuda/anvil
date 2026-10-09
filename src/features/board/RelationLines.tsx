import type { Board, Relation, RelationKind, Token } from "../../core/ipc";

const DEFAULT_TOKEN_W = 140;
const DEFAULT_TOKEN_H = 205;

interface Props {
  board: Board;
  tokens: Token[];
  relations: Relation[];
  relationKinds: RelationKind[];
}

interface EdgeGroup {
  from: Token;
  to: Token;
  relations: Relation[];
  directed: boolean;
}

export function RelationLines({
  board,
  tokens,
  relations,
  relationKinds,
}: Props) {
  const visibleKinds = board.visible_relation_kinds ?? [];

  // card_id → 该卡在画布上第一个 token
  const cardToToken = new Map<string, Token>();
  for (const t of tokens) {
    if (t.card_id && !cardToToken.has(t.card_id)) {
      cardToToken.set(t.card_id, t);
    }
  }

  // 分组：同一个 token 对之间
  const groups = new Map<string, EdgeGroup>();

  for (const r of relations) {
    if (r.meta?.scenario_id) continue;
    if (visibleKinds.length > 0 && !visibleKinds.includes(r.kind)) continue;

    const fromToken = cardToToken.get(r.from);
    const toToken = cardToToken.get(r.to);
    if (!fromToken || !toToken) continue;
    if (fromToken.id === toToken.id) continue;

    const kind = relationKinds.find((k) => k.id === r.kind);
    const directed = kind?.directed ?? true;

    let key: string;
    let a: Token;
    let b: Token;

    if (directed) {
      key = `d:${fromToken.id}->${toToken.id}`;
      a = fromToken;
      b = toToken;
    } else {
      const [x, y] =
        fromToken.id < toToken.id ? [fromToken, toToken] : [toToken, fromToken];
      key = `u:${x.id}<->${y.id}`;
      a = x;
      b = y;
    }

    const g = groups.get(key);
    if (g) {
      g.relations.push(r);
    } else {
      groups.set(key, {
        from: a,
        to: b,
        relations: [r],
        directed,
      });
    }
  }

  const items: React.ReactNode[] = [];

  for (const [key, g] of groups) {
    const x1 = g.from.x + (g.from.w ?? DEFAULT_TOKEN_W) / 2;
    const y1 = g.from.y + (g.from.h ?? DEFAULT_TOKEN_H) / 2;
    const x2 = g.to.x + (g.to.w ?? DEFAULT_TOKEN_W) / 2;
    const y2 = g.to.y + (g.to.h ?? DEFAULT_TOKEN_H) / 2;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    // 取第一条关系的颜色作为该组的颜色
    const firstKind = relationKinds.find((k) => k.id === g.relations[0].kind);
    const color = firstKind?.color ?? "var(--accent-gold)";

    const arrowEnd = g.directed ? "url(#rl-arrow)" : undefined;
    const arrowAgg = g.directed ? "url(#rl-arrow-agg)" : undefined;

    if (g.relations.length === 1) {
      items.push(
        <line
          key={key}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={2}
          markerEnd={arrowEnd}
          opacity={0.85}
          style={{ color }}
        />,
      );
    } else {
      items.push(
        <g key={key}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={4}
            markerEnd={arrowAgg}
            opacity={0.85}
            style={{ color }}
          />
          <circle
            cx={mx}
            cy={my}
            r={12}
            fill="var(--bg-panel)"
            stroke={color}
            strokeWidth={2}
          />
          <text
            x={mx}
            y={my}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--fg-primary)"
            fontSize="11"
            fontWeight="600"
            fontFamily="var(--font-mono)"
          >
            {g.relations.length}
          </text>
        </g>,
      );
    }
  }

  return (
    <svg
      width={board.width}
      height={board.height}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id="rl-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <marker
          id="rl-arrow-agg"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {items}
    </svg>
  );
}
