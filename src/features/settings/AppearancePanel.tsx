import { useProjectStore } from "../../stores/projectStore";
import { ThemePanel } from "../project/ThemePanel";
import { AppInterfacePanel } from "./AppInterfacePanel";
import { SectionLabel } from "../../components/SectionLabel";

interface Props {
  onSaveTheme: (id: string | null) => Promise<void>;
}

export function AppearancePanel({ onSaveTheme }: Props) {
  const manifest = useProjectStore((s) => s.manifest);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {manifest && (
        <div>
          <SectionLabel variant="block">主题</SectionLabel>
          <ThemePanel
            manifestThemeId={manifest.theme_id ?? null}
            onChangeThemeId={(id) => void onSaveTheme(id)}
          />
        </div>
      )}
      <div>
        <SectionLabel variant="block">界面</SectionLabel>
        <AppInterfacePanel />
      </div>
    </div>
  );
}
