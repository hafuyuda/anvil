# 注册表模式（Registry Pattern）

> 把「有限、可扩展、有默认回退」的枚举从散落的 switch / 硬编码，改成
> 「注册表 + `import.meta.glob` 自动发现」。新增一项只加一个文件。

## 适用范围

适合：
- 视觉风格（卡框 / 卡背 / 闪卡）
- 数据预设（内置主题）
- 视图模式（卡组视图）
- 渲染形态（棋盘网格形状）
- 分组分类（设置分类）

不适合：
- 后端枚举（Rust `FieldType` 等，扩展必须改 Rust）
- 有状态 slice 的模块（`ModuleKey`）
- 已有显式注册的（`lib/commands.ts`）

## 目录约定

```
features/<domain>/<thing>/
├── types.ts        # XxxDef + XxxProps
├── registry.ts     # import.meta.glob + Map + get/list/has
└── impl/           # 或 presets/ shapes/ styles/
    ├── xxx.ts
    └── yyy.tsx
```

- 子目录名优先 `impl/`；语义化可用 `presets/`（数据）/ `shapes/`（渲染）/ `styles/`（风格）
- 每个 impl **默认导出**一个 Def
- Def 含 JSX → `.tsx`；纯数据 → `.ts`
- 历史遗留 ID（如 `builtin:anvil-dark`）**逐字保留**，数据兼容优先于命名美观

## 接口约定

```ts
export interface XxxDef {
  id: string;          // 持久化 key，一旦发布不改名
  label: string;       // 下拉 / 标签显示
  order?: number;      // 手写 registry 用于排序；工厂不需要
  // 各领域特有字段
}
```

## 工厂 vs 手写

### 复用 `createStyleRegistry`（`src/lib/styleRegistry.ts`）

Def 是**纯数据**、**无 order 排序需求**时。工厂语义：`list()` = 默认置顶 + 其余按 id 字母序。

案例：卡框风格、卡背风格、闪卡风格、内置主题（自定义 `validate`）

### 手写 registry

出现任一情况：
- Def 含 React 组件（`Component` / `Panel` / `View`）
- Def 含函数（`render` / `run`）
- 需要 `order` 显式排序
- 需要 `onReady` 之外的初始化副作用

案例：卡组视图、棋盘网格形状、设置分类

### 手写模板

```ts
import type { XxxDef } from "./types";

const modules = import.meta.glob<{ default: XxxDef }>(
  "./impl/*.tsx",           // pattern 必须是字面量
  { eager: true },
);

const map = new Map<string, XxxDef>();
for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id) continue;
  map.set(def.id, def);
}

export const DEFAULT_XXX = "xxx";

export function getXxx(id?: string | null): XxxDef {
  if (id && map.has(id)) return map.get(id)!;
  return map.get(DEFAULT_XXX)!;
}

export function listXxxs(): XxxDef[] {
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export function hasXxx(id: string): boolean {
  return map.has(id);
}

export type { XxxDef } from "./types";
```

## 迁移步骤

1. **前置检查**：搜 enum / 联合类型 / 硬编码标签 / 分派 switch / 消费点
2. **确认数据兼容**：id 是否已持久化？有前缀吗？逐字保留
3. **定义接口**：`types.ts` 写 `XxxDef` + `XxxProps`
4. **建 registry**：工厂或手写
5. **迁移 impl**：原分支抽成文件，**逐行搬**，不改视觉 / 行为
6. **改分派点**：switch / 三元 / 硬编码列表 → `getXxx()` / `listXxxs()`
7. **改类型**：删联合类型，改 `string`
8. **改 UI 数据源**：下拉 / 按钮组走 `listXxxs()`
9. **验三条命令**：`tsc` / `prettier` / `vite build`
10. **归一化 diff**：`git show HEAD:<旧文件>` 与 new impl 对比
11. **跑 dev 手动清单**

## 已知坑

**`import.meta.glob` pattern 必须是字面量**
```ts
// ❌ 静态分析不到
function makeRegistry(pattern: string) {
  return import.meta.glob(pattern, { eager: true });
}
// ✅ 工厂接收 glob 结果
createStyleRegistry(import.meta.glob("./impl/*.tsx", { eager: true }), "default");
```

**深路径 import 深度**
从 `features/a/b/impl/xxx.tsx` 到 `src/core/ipc` 是 `../../../../core/ipc`。移动文件后重新核对深度。

**pnpm 非声明依赖**
只 import `package.json` 里声明的依赖。旧代码碰巧能解析的传递依赖（如 `@dnd-kit/sort`）在文件移动后会失败。

**`border-radius: inherit` 需要父级有值**
`FoilOverlay` 用 `border-radius: inherit` 而非 `radius` prop，要求父元素设了 `borderRadius`。

**`@keyframes` 名字加前缀**
多份 impl 各自注入 CSS，撞名会互相覆盖。约定 `<domain>-<style>-<name>`，如 `foil-gold-shine`。

**未使用字段的取舍**
旧 Def 有 UI 从不读的字段（如 `BuiltinTheme.description`）：迁移时删掉，或保留 optional。取舍标准是有没有真实未来用途。

**导出名与 IPC 不撞名**
内置主题 → `listBuiltinThemes`；IPC → `ipc.listThemes()`。消费方一眼可辨。

**React 类型在 `.tsx` 的用法**
`React.ReactNode` 作为**类型**引用无需 `import React`（UMD global 允许）。作为**值**引用才需要 import。

**`order` 与「视觉零改动」**
工厂 `list()` 按 id 字母序；旧列表若是策展顺序，迁移后会变。
- 接受 → 与其它 registry 一致
- 保序 → 手写 registry，加 `order`

## 验收清单

**命令**
```bash
pnpm tsc --noEmit
pnpm prettier --check src/
pnpm vite build
```

**静态**
- [ ] 旧联合类型 / enum 全局搜 = 0（只留 setter 等同名函数）
- [ ] 硬编码字面量只在 impl 的 `id` 和默认值常量处
- [ ] 归一化 diff（旧分支 vs new impl）逐行等价
- [ ] `import.meta.glob` pattern 是字面量
- [ ] 导出名与 IPC 不撞名

**手动**
- [ ] 切换器 / 列表项顺序不变（或明确记录顺序变化）
- [ ] 逐项切换，视觉 / 行为一致
- [ ] 旧数据（已持久化 id）正常
- [ ] 未知 id 回退默认不崩
- [ ] 加一个新 impl，UI 自动出现
- [ ] HMR 热更

## 案例索引

| 注册表 | 目录 | 工厂 | 默认回退 | 特有点 |
|---|---|---|---|---|
| 卡框风格 | `components/CardFrame/styles/` | ✓ | `yugioh` | `Component` |
| 卡背风格 | `components/CardFrame/primitives/back-styles/` | ✓ | `anvil` | `Component` |
| 闪卡风格 | `components/CardFrame/primitives/foil-styles/` | ✓ | `gold` | `css` + `onReady` 注入 |
| 内置主题 | `themes/` | ✓ | `builtin:anvil-dark` | 自定义 validate |
| 卡组视图 | `features/card-groups/views/` | ✗ | `grid` | `order` + `Component` |
| 棋盘形状 | `features/board/grid/` | ✗ | `square` | `order` + `render` |
| 设置分类 | `features/settings/categories/` | ✗ | `appearance` | `order` + `Panel` + `requiresProject` |