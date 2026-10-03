import { TopBar } from "./TopBar";
import { LeftNav } from "./LeftNav";
import { Workspace } from "./Workspace";
import { Inspector } from "./Inspector";
import { StatusBar } from "./StatusBar";

export function AppShell() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        color: "#222",
      }}
    >
      <TopBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <LeftNav />
        <Workspace />
        <Inspector />
      </div>
      <StatusBar />
    </div>
  );
}