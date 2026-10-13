/**
 * 风格注册表泛型工厂。
 *
 * 卡框 / 卡背 / 闪卡三份 registry 的公共结构：
 * `import.meta.glob` 收集模块 → 校验默认导出 → 建 Map → 默认回退。
 *
 * 注意：`import.meta.glob` 的 pattern 必须是**字面量**，Vite 才能
 * 静态分析，所以工厂接收 glob 的结果，而不是 pattern 字符串。
 */

export interface StyleDef {
  /** 唯一 id，持久化到项目数据 */
  id: string;
}

export interface CreateStyleRegistryOptions<T extends StyleDef> {
  /**
   * 校验模块默认导出是否合法。
   * 默认实现：检查 `id` 和 `label` 都存在。
   * 闪卡需自定义：检查 `id` 和 `css`（不要求 `label`）。
   */
  validate?: (def: unknown) => def is T;
  /**
   * 所有风格收集完成后同步调用一次。
   * 用于一次性副作用（如闪卡把 CSS 注入 <head>）。
   */
  onReady?: (styles: Map<string, T>) => void;
}

export interface StyleRegistry<T extends StyleDef> {
  /** 按 id 查风格；未知 id（含 null/undefined）回退默认，默认缺失时抛错 */
  get: (id?: string | null) => T;
  /** 下拉数据源：默认风格固定第一，其余按 id 字母序 */
  list: () => T[];
  /** 判断 id 是否已注册 */
  has: (id: string) => boolean;
  /** 默认风格 id */
  defaultId: string;
}

export function createStyleRegistry<T extends StyleDef>(
  modules: Record<string, { default: T }>,
  defaultId: string,
  options?: CreateStyleRegistryOptions<T>,
): StyleRegistry<T> {
  const styles = new Map<string, T>();

  const validate: (def: unknown) => def is T =
    options?.validate ??
    ((def: unknown): def is T => {
      const d = def as (Partial<T> & { label?: unknown }) | null | undefined;
      return !!d?.id && !!d?.label;
    });

  for (const mod of Object.values(modules)) {
    const def = mod?.default;
    if (!validate(def)) continue;
    styles.set(def.id, def);
  }

  options?.onReady?.(styles);

  return {
    defaultId,
    get(id) {
      if (id && styles.has(id)) return styles.get(id)!;
      const fallback = styles.get(defaultId);
      if (!fallback) {
        throw new Error(`style "${defaultId}" not registered`);
      }
      return fallback;
    },
    list() {
      const fallback = styles.get(defaultId);
      const rest = Array.from(styles.values())
        .filter((s) => s.id !== defaultId)
        .sort((a, b) => a.id.localeCompare(b.id));
      return fallback ? [fallback, ...rest] : rest;
    },
    has(id) {
      return styles.has(id);
    },
  };
}
