export interface BuiltinTheme {
  id: string; // "builtin:anvil-dark"
  name: string;
  description: string;
  variables: Record<string, string>;
}

export function isBuiltinThemeId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("builtin:");
}
