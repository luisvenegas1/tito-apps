/**
 * Tipos de dominio de Money Track (escritos a mano, patrón del monorepo).
 * Espejo de supabase/migrations/*.sql.
 */
export type Currency = "CRC" | "USD" | "EUR";
export type ForeignCurrency = Exclude<Currency, "CRC">;
export type TxnKind = "expense" | "income" | "advance" | "reimbursement";
export type PaidBy = "me" | "partner" | "shared" | "other";
export type TxnScope = "personal" | "household" | "shared";
export type RecurrenceFreq = "monthly" | "weekly" | "biweekly" | "yearly";
export type PaymentStatus = "pending" | "paid" | "skipped";
export type GoalType = "savings" | "spend_reduction";
export type SharedEntryType = "charge" | "payment";

export interface Profile {
  id: string;
  display_name: string | null;
  base_currency: Currency;
  locale: string;
  onboarded: boolean;
  reminder_days_before: number;
  push_enabled: boolean;
  auto_rates: boolean;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  kind_hint: TxnKind;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  sort_order: number;
}

export interface ExchangeRate {
  id: string;
  currency: ForeignCurrency;
  /** Compra: colones que te dan por cada unidad (se usa para ingresos). */
  buy: number;
  /** Venta: colones que pagas por cada unidad (se usa para gastos). */
  sell: number;
  source: "manual" | "bccr" | "seed";
  valid_from: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  user_id: string;
  kind: TxnKind;
  amount: number;
  currency: Currency;
  occurred_on: string;
  category_id: string | null;
  paid_by: PaidBy;
  payer_person_id: string | null;
  scope: TxnScope;
  my_share: number;
  /** TC congelado del día (colones por unidad). Nulo en colones. */
  fx_rate: number | null;
  shared_entry_id: string | null;
  recurring_template_id: string | null;
  linked_transaction_id: string | null;
  note: string | null;
  tags: string[];
  client_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionInput = Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at"> & {
  id?: string;
};

export interface SharedAccount {
  id: string;
  creditor_id: string;
  debtor_id: string | null;
  creditor_label: string;
  debtor_label: string;
  linked_card: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SharedEntry {
  id: string;
  account_id: string;
  type: SharedEntryType;
  amount: number;
  currency: Currency;
  occurred_on: string;
  concept: string;
  note: string | null;
  client_uuid: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SharedEntryHistory {
  id: number;
  entry_id: string;
  changed_by: string | null;
  changed_at: string;
  action: "update" | "delete" | "restore";
  old_row: SharedEntry;
}

export interface SharedInvite {
  id: string;
  account_id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface RecurringTemplate {
  id: string;
  user_id: string;
  kind: TxnKind;
  name: string;
  category_id: string | null;
  amount_est: number | null;
  currency: Currency;
  paid_by: PaidBy;
  scope: TxnScope;
  frequency: RecurrenceFreq;
  due_day: number | null;
  start_on: string;
  end_on: string | null;
  is_active: boolean;
}

export interface ScheduledPayment {
  id: string;
  template_id: string;
  due_date: string;
  amount_est: number | null;
  currency: Currency;
  status: PaymentStatus;
  transaction_id: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  type: GoalType;
  name: string;
  category_id: string | null;
  target_amount: number;
  saved_amount: number;
  currency: Currency;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  transaction_id: string;
  storage_path: string;
  mime_type: string | null;
}
