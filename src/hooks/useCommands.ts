import { useSyncExternalStore } from "react";
import { commandRegistry, type Command } from "../lib/commands";

let cached: Command[] = commandRegistry.list();

commandRegistry.subscribe(() => {
  cached = commandRegistry.list();
});

function subscribe(fn: () => void) {
  return commandRegistry.subscribe(fn);
}

function getSnapshot(): Command[] {
  return cached;
}

export function useCommands(): Command[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
