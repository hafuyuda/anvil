import type { FieldType } from "../../../core/ipc";

export const FIELD_KINDS: { kind: FieldType["kind"]; label: string }[] = [
  { kind: "text", label: "文本" },
  { kind: "rich_text", label: "富文本" },
  { kind: "number", label: "数字" },
  { kind: "bool", label: "布尔" },
  { kind: "date", label: "日期" },
  { kind: "color", label: "颜色" },
  { kind: "enum", label: "枚举" },
  { kind: "multi_enum", label: "多选枚举" },
  { kind: "tags", label: "标签" },
  { kind: "ref", label: "引用" },
  { kind: "image", label: "图片" },
  { kind: "url", label: "URL" },
  { kind: "json", label: "JSON" },
];

export function defaultFieldType(kind: FieldType["kind"]): FieldType {
  switch (kind) {
    case "enum":
      return { kind: "enum", options: [] };
    case "multi_enum":
      return { kind: "multi_enum", options: [] };
    case "ref":
      return { kind: "ref", target_types: [] };
    default:
      return { kind } as FieldType;
  }
}
