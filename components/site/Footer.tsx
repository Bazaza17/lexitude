export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
          Lexitude · built for the eMerge AI Hackathon
        </div>
        <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#workflow" className="hover:text-foreground">Workflow</a>
          <a
            href="https://github.com/Bazaza17/lexitude"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
