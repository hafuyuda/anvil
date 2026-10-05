export function applyTheme(variables: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    if (key.startsWith("--")) {
      root.style.setProperty(key, value);
    }
  }
}

export function resetTheme() {
  const root = document.documentElement;
  const style = root.style;
  const toRemove: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith("--")) toRemove.push(name);
  }
  for (const name of toRemove) {
    root.style.removeProperty(name);
  }
}
