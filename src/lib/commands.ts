export interface Command {
  id: string;
  label: string;
  category: string;
  keywords?: string[];
  shortcut?: string;
  run: () => void | Promise<void>;
}

type Listener = () => void;

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
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
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}

export const commandRegistry = new CommandRegistry();
