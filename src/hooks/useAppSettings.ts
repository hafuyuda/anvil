import { useSyncExternalStore } from "react";
import {
  getAppSettings,
  subscribeAppSettings,
  type AppSettings,
} from "../lib/appSettings";

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(
    subscribeAppSettings,
    getAppSettings,
    getAppSettings,
  );
}
