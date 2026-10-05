import { useState } from "react";
import { ipc, type Session } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { SessionEditor } from "./SessionEditor";

export function SessionList() {
  const sessions = useProjectStore((s) => s.sessions) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addSession() {
    const now = Date.now();
    const s: Session = {
      id: crypto.randomUUID(),
      name: "新会话",
      board_id: null,
      state: {},
      tokens: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertSession(s);
    upsertSession(s);
    setSelectedId(s.id);
  }

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 180, overflow: "auto" }}>
        <button onClick={addSession}>新建会话</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((s) => (
            <li
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: s.id === selectedId ? "bold" : "normal",
              }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {selected ? (
          <SessionEditor key={selected.id} session={selected} />
        ) : (
          <p style={{ color: "#888" }}>选择或新建一个会话</p>
        )}
      </div>
    </div>
  );
}
