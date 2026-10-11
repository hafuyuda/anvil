import { AppEditorPanel } from "./AppEditorPanel";
import { AppVnPanel } from "./AppVnPanel";
import { SectionLabel } from "../../components/SectionLabel";

export function EditorPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <SectionLabel variant="block">保存与历史</SectionLabel>
        <AppEditorPanel />
      </div>
      <div>
        <SectionLabel variant="block">视觉小说</SectionLabel>
        <AppVnPanel />
      </div>
    </div>
  );
}
