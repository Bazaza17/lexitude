import { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-elevated px-1 font-mono text-[10px] font-medium leading-none text-muted-foreground">
      {children}
    </kbd>
  );
}
