/**
 * 导出件的端到端冒烟测试：把 `export_html.rs` 的模板脚本原文 + 引擎产物
 * 拼起来，在最小 DOM 桩上真跑一遍「点击推进 → 选项 → 结局」。
 *
 * 为什么需要它：对拍测试只能证明语义一致（两侧本来就是同一份 bundle），
 * 证明不了模板那层胶水写对了——`READER.frontmatter(...)`、`reader.choose(...)`
 * 这类调用一旦写错，只有读者打开导出件才会发现。
 */
import { describe, expect, it } from "vitest";
import templateSource from "../../../../../src-tauri/src/core/store/export_html.rs?raw";
import bundleSource from "../../../../../src-tauri/src/core/store/reader_runtime.js?raw";

// ---------------------------------------------------------------------------
// 最小 DOM 桩：够模板用即可（createElement / textContent / appendChild /
// innerHTML 清空 / 事件注册 / scrollIntoView）
// ---------------------------------------------------------------------------

class FakeEl {
  className = "";
  id = "";
  src = "";
  alt = "";
  style: Record<string, string> = {};
  children: FakeEl[] = [];
  parent: FakeEl | null = null;
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  private text = "";

  constructor(public tagName: string) {}

  get firstChild(): FakeEl | null {
    return this.children[0] ?? null;
  }

  get textContent(): string {
    if (this.children.length === 0) return this.text;
    return this.children.map((c) => c.textContent).join("");
  }

  set textContent(v: string) {
    this.text = String(v);
    this.children = [];
  }

  set innerHTML(v: string) {
    this.children = [];
    this.text = "";
    void v;
  }

  get innerHTML(): string {
    return this.textContent;
  }

  get classList() {
    const self = this;
    return {
      add(cls: string) {
        if (!self.className.split(" ").includes(cls)) {
          self.className = `${self.className} ${cls}`.trim();
        }
      },
      remove(cls: string) {
        self.className = self.className
          .split(" ")
          .filter((c) => c !== cls)
          .join(" ");
      },
    };
  }

  appendChild(child: FakeEl): FakeEl {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child: FakeEl, ref: FakeEl | null): FakeEl {
    child.parent = this;
    const idx = ref ? this.children.indexOf(ref) : -1;
    if (idx < 0) this.children.unshift(child);
    else this.children.splice(idx, 0, child);
    return child;
  }

  remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }

  addEventListener(type: string, fn: (e: unknown) => void): void {
    (this.listeners[type] ??= []).push(fn);
  }

  fire(type: string, event: unknown): void {
    for (const fn of this.listeners[type] ?? []) fn(event);
  }

  scrollIntoView(): void {}

  closest(): null {
    return null;
  }
}

/** 定时器桩：记录回调，由测试显式「跑完」，避免真等待打字机。 */
function makeTimers() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    setInterval(fn: () => void) {
      const id = nextId++;
      pending.set(id, fn);
      return id;
    },
    clearInterval(id: number) {
      pending.delete(id);
    },
    /** 把当前所有未清除的 interval 跑到自行清除为止。 */
    flush() {
      for (let guard = 0; guard < 10000; guard++) {
        if (pending.size === 0) return;
        for (const [id, fn] of [...pending]) {
          if (!pending.has(id)) continue;
          fn();
        }
      }
      throw new Error("定时器没有收敛（打字机未结束）");
    },
  };
}

interface Harness {
  document: { body: FakeEl; getElementById: (id: string) => FakeEl | null };
  host: (id: string) => FakeEl;
  advance: () => void;
  timers: ReturnType<typeof makeTimers>;
  allText: () => string;
}

function runTemplate(story: {
  name: string;
  entryKnot: string | null;
  files: Record<string, string[]>;
}): Harness {
  const start = templateSource.indexOf("<script>");
  const end = templateSource.indexOf("</script>");
  if (start === -1 || end === -1)
    throw new Error("模板结构变了：找不到 <script>");
  const data = {
    scenario: {
      name: story.name,
      description: null,
      entry_knot: story.entryKnot,
    },
    files: story.files,
    assets: {},
    portraits: {},
  };
  // 用函数替换，避免 bundle 里的 `$&` 之类被当作替换模式
  const js = templateSource
    .slice(start + "<script>".length, end)
    .replace("__DATA__", () => JSON.stringify(data))
    .replace("__RUNTIME__", () => bundleSource);

  const ids = new Map<string, FakeEl>();
  for (const id of [
    "title",
    "desc",
    "scene-host",
    "choices",
    "ending-host",
    "hint",
  ]) {
    ids.set(id, new FakeEl("div"));
  }
  const body = new FakeEl("body");
  const doc = {
    body,
    getElementById: (id: string) => ids.get(id) ?? null,
    createElement: (tag: string) => new FakeEl(tag),
  };

  const timers = makeTimers();
  const factory = new Function(
    "document",
    "setInterval",
    "clearInterval",
    `${js}\nreturn { advance };`,
  );
  const api = factory(doc, timers.setInterval, timers.clearInterval) as {
    advance: () => void;
  };

  const host = (id: string) => {
    const el = ids.get(id);
    if (!el) throw new Error(`缺少 #${id}`);
    return el;
  };

  // 首屏：main() 已跑完，把首个打字机跑完，测试才能看到完整文本
  timers.flush();

  return {
    document: doc,
    host,
    timers,
    advance() {
      // 模拟读者的一下点击：文本已打完（timer 收敛）→ 推进
      timers.flush();
      api.advance();
      timers.flush();
    },
    allText() {
      return host("scene-host").textContent;
    },
  };
}
const STORY = {
  name: "测试剧情",
  entryKnot: null as string | null,
  files: {
    "main.md": [
      "=== 开场",
      "> 铁砧发红。",
      "**铁匠**：你要打什么？",
      "* 收下钱",
      "> 你收下了。",
      "* 拒绝",
      "> 你摇了摇头。",
      "- 他叹了口气。",
      "-> END",
    ],
  },
};

describe("导出 HTML 模板（配合引擎产物）", () => {
  it("推进、选项、汇合、结局都能走通", () => {
    const h = runTemplate(STORY);

    expect(h.host("title").textContent).toBe("测试剧情");
    expect(h.allText()).toContain("铁砧发红。");

    h.advance();
    expect(h.allText()).toContain("铁匠：你要打什么？");

    h.advance();
    // 到这里应出现选项（第一个 choice 组）
    const buttons = h.host("choices").children;
    expect(buttons.map((b) => b.textContent)).toEqual(["收下钱", "拒绝"]);

    buttons[0].fire("click", {
      stopPropagation() {},
      target: new FakeEl("button"),
    });
    h.timers.flush();
    expect(h.allText()).toContain("你收下了。");

    h.advance();
    expect(h.allText()).toContain("他叹了口气。");

    h.advance();
    const ending = h.host("ending-host").children[0];
    expect(ending).toBeTruthy();
    expect(ending.textContent).toContain("故事到此结束");
  });

  it("重新开始后回到第一行，不残留旧内容", () => {
    const h = runTemplate(STORY);
    h.advance(); // → 对白
    h.advance(); // → 选项
    h.host("choices").children[0].fire("click", {
      stopPropagation() {},
      target: new FakeEl("button"),
    });
    h.timers.flush();
    h.advance(); // → 汇合行
    h.advance(); // → 结局

    const ending = h.host("ending-host").children[0];
    const restartBtn = ending.children.find((c) => c.tagName === "button");
    expect(restartBtn).toBeTruthy();

    restartBtn?.fire("click", {
      stopPropagation() {},
      target: new FakeEl("button"),
    });
    h.timers.flush();
    expect(h.host("scene-host").children).toHaveLength(1);
    expect(h.allText()).toContain("铁砧发红。");
  });

  it("入口 knot 写错时把错误显示在舞台上，而不是白屏", () => {
    const h = runTemplate({ ...STORY, entryKnot: "不存在的章" });
    expect(h.allText()).toContain("找不到入口 knot：不存在的章");
  });
});
