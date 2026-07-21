import packageJson from "../../package.json";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div><strong className="text-fg">Tito Apps</strong><p>Apps que simplifican tu vida</p></div>
        <div className="sm:text-right"><p>© 2026 Tito Apps · v{packageJson.version}</p><a className="text-info underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="https://github.com/luisvenegas1/tito-apps" target="_blank" rel="noreferrer">GitHub <span className="sr-only">(abre en una pestaña nueva)</span></a></div>
      </div>
    </footer>
  );
}
