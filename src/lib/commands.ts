export interface Command {
  id: string;
  label: string;
  category: string;
  keywords?: string[];
  shortcut?: string;
  run: () => void | Promise<void>;
}

/**
 * 动态结果源。
 *
 * 命令面板此前的「结果」只有静态命令。卡牌全文检索没法预先注册成命令 ——
 * 一张卡一条命令的话，一万张卡就是一万条注册、一万次 notify，
 * 而且只匹配卡名，字段与文档正文完全够不到。改成源：面板拿着 query
 * 来问，源现查现给，卡牌增删改名也不必重新注册。
 */
export interface ResultSource {
  id: string;
  /** 少于这个字符数就不查。默认 1，具体下限由源自己定更合适。 */
  minChars?: number;
  search: (query: string) => Command[] | Promise<Command[]>;
}

type Listener = () => void;

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private sources: Map<string, ResultSource> = new Map();
  private listeners: Set<Listener> = new Set();

  register(cmd: Command): () => void {
    this.commands.set(cmd.id, cmd);
    this.notify();
    return () => {
      this.commands.delete(cmd.id);
      this.notify();
    };
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * 注册结果源。**不通知听众** —— 源不改变静态命令列表，
   * 而每次 notify 都会让整个面板重算一遍过滤。源在挂载时注册一次，
   * 面板渲染时现取即可。
   */
  registerSource(source: ResultSource): () => void {
    this.sources.set(source.id, source);
    return () => {
      this.sources.delete(source.id);
    };
  }

  listSources(): ResultSource[] {
    return Array.from(this.sources.values());
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}

export const commandRegistry = new CommandRegistry();
