import { Input } from "@titoapps/ui";

export function AppSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="relative flex-1"><label htmlFor="app-search" className="sr-only">Buscar aplicaciones</label><span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span><Input id="app-search" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar aplicaciones..." className="pl-9" /></div>;
}
