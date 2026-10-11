import { useProjectStore } from "../../stores/projectStore";
import { StatsTab } from "../project/StatsTab";
import { AppAdvancedPanel } from "./AppAdvancedPanel";

export function AdvancedPanel() {
  const projectPath = useProjectStore((s) => s.projectPath);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {projectPath && <StatsTab />}
      <AppAdvancedPanel />
    </div>
  );
}
