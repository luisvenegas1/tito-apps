/**
 * Pruebas de RLS contra Supabase LOCAL (spec §8).
 *   pnpm --filter moneytrack db:start   # una vez
 *   pnpm --filter moneytrack test:rls
 *
 * Tres usuarios: acreedor (Luis), deudora (mamá) y un extraño.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55421";
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const PRIVATE_TABLES = [
  "profiles",
  "people",
  "categories",
  "exchange_rates",
  "transactions",
  "recurring_templates",
  "scheduled_payments",
  "attachments",
  "goals",
  "notifications",
  "push_subscriptions",
] as const;

const run = Date.now();
const email = (who: string) => `${who}.${run}@moneytrack.test`;
const PASSWORD = "prueba-rls-123";

async function newUser(who: string): Promise<{ db: SupabaseClient; id: string; email: string }> {
  const db = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await db.auth.signUp({ email: email(who), password: PASSWORD });
  if (error || !data.user) throw error ?? new Error("sin usuario");
  return { db, id: data.user.id, email: email(who) };
}

let luis: Awaited<ReturnType<typeof newUser>>;
let mama: Awaited<ReturnType<typeof newUser>>;
let extrano: Awaited<ReturnType<typeof newUser>>;
let accountId: string;
let chargeId: string;
let luisTxId: string;

beforeAll(async () => {
  [luis, mama, extrano] = await Promise.all([newUser("luis"), newUser("mama"), newUser("extrano")]);

  // Datos privados de Luis
  const { data: cat } = await luis.db.from("categories").select("id").limit(1).single();
  const { data: tx, error: txErr } = await luis.db
    .from("transactions")
    .insert({ user_id: luis.id, kind: "expense", amount: 15000, currency: "CRC", category_id: cat!.id })
    .select("id")
    .single();
  if (txErr) throw txErr;
  luisTxId = tx!.id;
  await luis.db.from("goals").insert({ user_id: luis.id, type: "savings", name: "Viaje", target_amount: 1000 });

  // Cuenta compartida + invitación aceptada por mamá
  const { data: acc, error: accErr } = await luis.db
    .from("shared_accounts")
    .insert({ creditor_id: luis.id, creditor_label: "Luis", debtor_label: "Mamá" })
    .select("id")
    .single();
  if (accErr) throw accErr;
  accountId = acc!.id;

  const { data: ch } = await luis.db
    .from("shared_entries")
    .insert({ account_id: accountId, type: "charge", amount: 50000, currency: "CRC", occurred_on: "2026-09-01", concept: "Súper" })
    .select("id")
    .single();
  chargeId = ch!.id;

  const { data: token, error: invErr } = await luis.db.rpc("create_invite", { p_account: accountId, p_email: mama.email });
  if (invErr) throw invErr;
  const { error: accErr2 } = await mama.db.rpc("accept_invite", { p_token: token });
  if (accErr2) throw accErr2;
}, 30_000);

describe("privacidad de tablas privadas", () => {
  for (const table of PRIVATE_TABLES) {
    it(`mamá y el extraño no leen filas de Luis en ${table}`, async () => {
      const col = table === "profiles" ? "id" : "user_id";
      for (const other of [mama, extrano]) {
        const { data, error } = await other.db.from(table).select("*").eq(col, luis.id);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      }
    });
  }

  it("nadie más puede modificar ni borrar una transacción de Luis", async () => {
    for (const other of [mama, extrano]) {
      await other.db.from("transactions").update({ amount: 1 }).eq("id", luisTxId);
      await other.db.from("transactions").delete().eq("id", luisTxId);
    }
    const { data } = await luis.db.from("transactions").select("amount").eq("id", luisTxId).single();
    expect(Number(data!.amount)).toBe(15000);
  });

  it("no se puede insertar una fila a nombre de otro usuario", async () => {
    const { error } = await mama.db
      .from("transactions")
      .insert({ user_id: luis.id, kind: "expense", amount: 1, currency: "CRC" });
    expect(error).not.toBeNull();
  });
});

describe("cuenta compartida", () => {
  it("ambos miembros ven la cuenta y sus movimientos; el extraño no", async () => {
    for (const member of [luis, mama]) {
      const { data } = await member.db.from("shared_entries").select("id").eq("account_id", accountId);
      expect(data?.length).toBe(1);
    }
    const { data: a } = await extrano.db.from("shared_accounts").select("id").eq("id", accountId);
    const { data: e } = await extrano.db.from("shared_entries").select("id").eq("account_id", accountId);
    expect(a).toEqual([]);
    expect(e).toEqual([]);
  });

  it("mamá puede registrar un abono y el saldo baja", async () => {
    const { error } = await mama.db
      .from("shared_entries")
      .insert({ account_id: accountId, type: "payment", amount: 20000, currency: "CRC", occurred_on: "2026-09-10", concept: "Depósito" });
    expect(error).toBeNull();
    const { data } = await luis.db.from("shared_balances").select("currency, balance").eq("account_id", accountId);
    expect(data).toEqual([{ currency: "CRC", balance: 30000 }]);
  });

  it("el extraño no puede escribir en la cuenta", async () => {
    const { error } = await extrano.db
      .from("shared_entries")
      .insert({ account_id: accountId, type: "charge", amount: 1, currency: "CRC", occurred_on: "2026-09-10", concept: "x" });
    expect(error).not.toBeNull();
  });

  it("created_by lo fija la base, no el cliente", async () => {
    const { data } = await mama.db
      .from("shared_entries")
      .insert({ account_id: accountId, type: "charge", amount: 100, currency: "USD", occurred_on: "2026-09-11", concept: "Farmacia", created_by: luis.id })
      .select("created_by")
      .single();
    expect(data!.created_by).toBe(mama.id);
  });

  it("no hay borrado físico; el soft delete queda en el historial", async () => {
    await mama.db.from("shared_entries").delete().eq("id", chargeId);
    const { data: still } = await luis.db.from("shared_entries").select("id").eq("id", chargeId);
    expect(still?.length).toBe(1);

    const { error } = await mama.db.from("shared_entries").update({ deleted_at: new Date().toISOString() }).eq("id", chargeId);
    expect(error).toBeNull();
    const { data: hist } = await luis.db.from("shared_entry_history").select("action, changed_by").eq("entry_id", chargeId);
    expect(hist).toEqual([{ action: "delete", changed_by: mama.id }]);
  });

  it("nadie puede cambiar acreedor ni deudor desde el cliente", async () => {
    const { error } = await luis.db.from("shared_accounts").update({ debtor_id: extrano.id }).eq("id", accountId);
    expect(error).not.toBeNull();
    // La deudora no puede editar la cuenta (0 filas afectadas)
    await mama.db.from("shared_accounts").update({ debtor_label: "Hackeada" }).eq("id", accountId);
    const { data } = await luis.db.from("shared_accounts").select("debtor_id, debtor_label").eq("id", accountId).single();
    expect(data).toEqual({ debtor_id: mama.id, debtor_label: "Mamá" });
  });

  it("mamá pasa un cargo a sus gastos sin que Luis lo vea", async () => {
    const { data: e } = await luis.db
      .from("shared_entries")
      .insert({ account_id: accountId, type: "charge", amount: 7000, currency: "CRC", occurred_on: "2026-09-12", concept: "Panadería" })
      .select("id")
      .single();
    const { data: cat } = await mama.db.from("categories").select("id").limit(1).single();
    const { error } = await mama.db.rpc("add_charge_to_expenses", { p_entry: e!.id, p_category: cat!.id });
    expect(error).toBeNull();
    const { error: dup } = await mama.db.rpc("add_charge_to_expenses", { p_entry: e!.id, p_category: cat!.id });
    expect(dup).not.toBeNull(); // una sola vez
    const { data: luisSees } = await luis.db.from("transactions").select("id").eq("shared_entry_id", e!.id);
    expect(luisSees).toEqual([]);
  });

  it("Luis registra un cargo pagado con su dinero: queda en su libro privado como adelanto y mamá no lo ve", async () => {
    const { data: entryId, error } = await luis.db.rpc("charge_and_expense", {
      p_account: accountId,
      p_amount: 12500,
      p_currency: "EUR",
      p_date: "2026-09-15",
      p_concept: "Farmacia",
      p_category: null,
      p_kind: "advance",
    });
    expect(error).toBeNull();
    const { data: mine } = await luis.db.from("transactions").select("kind, currency").eq("shared_entry_id", entryId);
    expect(mine).toEqual([{ kind: "advance", currency: "EUR" }]);
    const { data: hers } = await mama.db.from("transactions").select("id").eq("shared_entry_id", entryId);
    expect(hers).toEqual([]);
    const { data: entry } = await mama.db.from("shared_entries").select("concept").eq("id", entryId).single();
    expect(entry).toEqual({ concept: "Farmacia" });
  });

  it("un cargo no se puede ligar como ingreso", async () => {
    const { error } = await luis.db.rpc("charge_and_expense", {
      p_account: accountId, p_amount: 1, p_currency: "CRC", p_date: "2026-09-15", p_concept: "x", p_category: null, p_kind: "income",
    });
    expect(error?.message).toMatch(/no permitido/);
  });

  it("el extraño no puede ligar un gasto a un cargo ajeno", async () => {
    const { error } = await extrano.db
      .from("transactions")
      .insert({ user_id: extrano.id, kind: "expense", amount: 1, currency: "CRC", shared_entry_id: chargeId });
    expect(error).not.toBeNull();
  });
});

describe("invitaciones", () => {
  it("solo funciona con el correo invitado, una vez, y no si la cuenta ya está vinculada", async () => {
    const { data: acc } = await luis.db
      .from("shared_accounts")
      .insert({ creditor_id: luis.id, creditor_label: "Luis", debtor_label: "Hermano" })
      .select("id")
      .single();
    const { data: token } = await luis.db.rpc("create_invite", { p_account: acc!.id, p_email: mama.email });

    const wrong = await extrano.db.rpc("accept_invite", { p_token: token });
    expect(wrong.error?.message).toMatch(/es para/);

    const ok = await mama.db.rpc("accept_invite", { p_token: token });
    expect(ok.error).toBeNull();

    const again = await mama.db.rpc("accept_invite", { p_token: token });
    expect(again.error).not.toBeNull();

    const reinvite = await luis.db.rpc("create_invite", { p_account: acc!.id, p_email: extrano.email });
    expect(reinvite.error?.message).toMatch(/ya está vinculada/);
  });

  it("solo el acreedor puede invitar", async () => {
    const { error } = await mama.db.rpc("create_invite", { p_account: accountId, p_email: extrano.email });
    expect(error).not.toBeNull();
  });

  it("la vista previa no expone montos y marca tokens inválidos", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { data } = await anon.rpc("invite_preview", { p_token: "no-existe" });
    expect(data).toEqual([]);
  });
});

describe("recurrencia", () => {
  it("genera pagos idempotentes y marcar pagado crea la transacción", async () => {
    const { data: t } = await luis.db
      .from("recurring_templates")
      .insert({ user_id: luis.id, name: "Condominio", amount_est: 85000, currency: "CRC", due_day: 31, start_on: "2026-01-15" })
      .select("id")
      .single();
    const first = await luis.db.rpc("generate_scheduled_payments", { p_until: "2026-12-31" });
    const second = await luis.db.rpc("generate_scheduled_payments", { p_until: "2026-12-31" });
    expect(first.data).toBeGreaterThan(0);
    expect(second.data).toBe(0);

    const { data: feb } = await luis.db
      .from("scheduled_payments")
      .select("id, due_date")
      .eq("template_id", t!.id)
      .order("due_date")
      .limit(1)
      .single();
    expect(feb).toBeTruthy();

    const { data: txId, error } = await luis.db.rpc("pay_scheduled_payment", { p_id: feb!.id, p_amount: 86000 });
    expect(error).toBeNull();
    const { data: sp } = await luis.db.from("scheduled_payments").select("status, transaction_id").eq("id", feb!.id).single();
    expect(sp).toEqual({ status: "paid", transaction_id: txId });

    // Mamá no ve los pagos programados de Luis
    const { data: hidden } = await mama.db.from("scheduled_payments").select("id").eq("template_id", t!.id);
    expect(hidden).toEqual([]);
  });
});
