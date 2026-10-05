import { invoke } from "@tauri-apps/api/core";

export async function invokeSafe<T>(
  cmd: string,
  args?: Record<string, unknown>,
  label?: string,
): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    alert(`${label ?? cmd} 失败: ${e}`);
    return null;
  }
}
