export const theme = {
  bg: {
    app: "#1a1612",
    panel: "#25201a",
    surface: "#2f2922",
    raised: "#3a332a",
  },
  fg: {
    primary: "#e8dcc5",
    secondary: "#a89880",
    muted: "#6d6252",
    inverse: "#1a1510",
  },
  accent: {
    iron: "#5a5a5a",
    steel: "#7a8590",
    copper: "#a05a2c",
    gold: "#c9a961",
    ember: "#c8401f",
    flame: "#e07b39",
  },
  border: {
    subtle: "#3a3226",
    default: "#4a4033",
    strong: "#5a4d3d",
    accent: "#c9a961",
  },
  semantic: {
    danger: "#c8401f",
    success: "#6a8f4a",
    warning: "#c9a961",
  },
  radius: { sm: 2, md: 4, lg: 6 },
  font: {
    body: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    title: 'Georgia, "Songti SC", "STSong", serif',
    mono: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
  },
} as const;