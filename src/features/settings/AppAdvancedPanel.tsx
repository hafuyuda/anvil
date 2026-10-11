import { resetAppSettings } from "../../lib/appSettings";
import { clearAssetCache } from "../../lib/assetCache";
import { confirmDialog } from "../../lib/confirm";
import { toast } from "../../lib/toast";
import { SectionLabel } from "../../components/SectionLabel";
import { resetModuleOrder } from "../../lib/moduleOrder";

export function AppAdvancedPanel() {
  async function handleClearCaches() {
    if (
      !(await confirmDialog({
        message: "清除图片和音频缓存？不影响项目数据。",
        confirmLabel: "清除",
      }))
    )
      return;
    clearAssetCache();
    toast.success("已清除缓存");
  }

  async function handleReset() {
    if (
      !(await confirmDialog({
        message: "恢复全部应用设置为默认值？",
        confirmLabel: "恢复",
        danger: true,
      }))
    )
      return;
    resetAppSettings();
    resetModuleOrder();
    toast.success("已恢复默认设置");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section label="缓存">
        <p
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            margin: "0 0 8px",
          }}
        >
          图片和音频的加载缓存。清除后下次访问会重新加载。
        </p>
        <button className="btn" onClick={handleClearCaches}>
          清除缓存
        </button>
      </Section>

      <Section label="重置">
        <p
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            margin: "0 0 8px",
          }}
        >
          恢复所有应用设置为默认值。项目数据不受影响。
        </p>
        <button className="btn btn-danger" onClick={handleReset}>
          恢复默认设置
        </button>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel variant="block">{label}</SectionLabel>
      {children}
    </div>
  );
}
