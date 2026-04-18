import { ReactNode } from "react";

export function AppHeader({
  title,
  breadcrumb,
  actions,
}: {
  title: string;
  breadcrumb?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {breadcrumb && (
          <>
            <span className="font-mono text-xs text-muted-foreground">{breadcrumb}</span>
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              className="text-muted-foreground/60"
            >
              <path
                d="M4 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
        <h1 className="truncate text-sm font-medium text-foreground">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}
