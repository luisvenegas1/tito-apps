import { useState } from "react";
import {
  applyBrand,
  golpayBrand,
  splitpayBrand,
  titoAppsBrand,
  setTheme,
  AppBrand,
} from "@titoapps/brand";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  CurrencyInput,
  DateInput,
  Dialog,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  Spinner,
  ToastProvider,
  useToast,
} from "@titoapps/ui";

const BRANDS: Record<string, AppBrand> = {
  "Tito Apps": titoAppsBrand,
  GolPay: golpayBrand,
  SplitPay: splitpayBrand,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function Gallery() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [amount, setAmount] = useState(2200);
  const [checked, setChecked] = useState(true);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Section title="Buttons">
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Peligro</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Badges">
        <Badge>Neutral</Badge>
        <Badge tone="primary">Primary</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
      </Section>

      <Section title="Inputs">
        <div className="w-full max-w-xs space-y-3">
          <FormField label="Nombre">
            <Input placeholder="Escribí tu nombre" />
          </FormField>
          <FormField label="Monto" hint="Símbolo configurable por app">
            <CurrencyInput value={amount} onValueChange={setAmount} currencySymbol="₡" />
          </FormField>
          <FormField label="Fecha">
            <DateInput />
          </FormField>
          <FormField label="Tipo">
            <Select>
              <option>Mejenga</option>
              <option>Torneo</option>
            </Select>
          </FormField>
          <Checkbox label="Puede jugar de portero" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        </div>
      </Section>

      <Section title="Card / EmptyState">
        <Card className="w-64">
          <div className="font-semibold text-fg">Tarjeta</div>
          <p className="text-sm text-muted">Contenido de ejemplo sobre superficie.</p>
        </Card>
        <div className="w-64">
          <EmptyState title="Sin datos" description="Todavía no hay nada acá." icon="📭"
            action={<Button size="sm">Crear</Button>} />
        </div>
      </Section>

      <Section title="Feedback">
        <Spinner />
        <Skeleton className="h-6 w-40" />
        <Button variant="ghost" onClick={() => toast.show("Copiado", "success")}>Toast</Button>
        <Button variant="ghost" onClick={() => setModal(true)}>Modal</Button>
        <Button variant="ghost" onClick={() => setDialog(true)}>Dialog</Button>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)}>
        <h3 className="text-lg font-bold text-fg">Modal (hoja inferior)</h3>
        <p className="mt-1 text-sm text-muted">Contenido de ejemplo.</p>
        <Button className="mt-4" fullWidth onClick={() => setModal(false)}>Cerrar</Button>
      </Modal>

      <Dialog open={dialog} title="¿Eliminar?" description="Esta acción no se puede deshacer."
        danger confirmLabel="Eliminar" onConfirm={() => setDialog(false)} onCancel={() => setDialog(false)} />
    </div>
  );
}

export function App() {
  const [brandName, setBrandName] = useState("Tito Apps");
  const [dark, setDark] = useState(false);

  function pickBrand(name: string) {
    setBrandName(name);
    applyBrand(BRANDS[name]);
  }
  function toggleDark() {
    const next = !dark;
    setDark(next);
    setTheme(next ? "dark" : "light");
  }

  return (
    <ToastProvider>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-surface/90 px-6 py-4 backdrop-blur">
        <div>
          <img
            src={dark ? "/logo-titoapps-white.svg" : "/logo-titoapps.svg"}
            alt="Tito Apps"
            className="h-8 w-auto"
          />
          <p className="mt-1 text-sm text-muted">Apps que simplifican tu vida.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={brandName} onChange={(e) => pickBrand(e.target.value)} className="py-1.5 text-sm">
            {Object.keys(BRANDS).map((b) => <option key={b}>{b}</option>)}
          </Select>
          <Button size="sm" variant="ghost" onClick={toggleDark}>{dark ? "☀️" : "🌙"}</Button>
        </div>
      </header>
      <div className="px-6 pt-8">
        <h1 className="text-xl font-extrabold text-fg">Tito Apps Design System</h1>
        <p className="mt-1 text-sm text-muted">Componentes de @titoapps/ui sobre los tokens oficiales.</p>
      </div>
      <Gallery />
    </ToastProvider>
  );
}
