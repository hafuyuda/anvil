export const PRESET_VARIABLES: { key: string; label: string }[] = [
  { key: "--bg-app", label: "应用背景" },
  { key: "--bg-panel", label: "面板背景" },
  { key: "--bg-surface", label: "表面背景" },
  { key: "--bg-raised", label: "悬停背景" },
  { key: "--fg-primary", label: "主文字" },
  { key: "--fg-secondary", label: "次要文字" },
  { key: "--fg-muted", label: "弱化文字" },
  { key: "--accent-gold", label: "金色强调" },
  { key: "--accent-copper", label: "铜色强调" },
  { key: "--accent-ember", label: "暗红强调" },
  { key: "--border-subtle", label: "细边框" },
  { key: "--border-default", label: "默认边框" },
  { key: "--danger", label: "危险" },
  { key: "--success", label: "成功" },
];

export function readCurrentVariables(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const { key } of PRESET_VARIABLES) {
    const v = cs.getPropertyValue(key).trim();
    if (v) out[key] = v;
  }
  return out;
}
