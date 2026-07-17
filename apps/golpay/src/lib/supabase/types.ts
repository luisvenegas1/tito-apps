/**
 * Tipos del dominio. En producción podés generarlos con:
 *   npx supabase gen types typescript --project-id XXXX > src/lib/supabase/types.ts
 * Aquí van escritos a mano para el MVP.
 */

export type MatchType = "mejenga" | "torneo";
export type MatchStatus = "abierto" | "cerrado" | "cancelado";
export type PaymentStatus =
  | "pendiente"
  | "reportado"
  | "confirmado"
  | "parcial"
  | "exonerado"
  | "no_asistio";
export type AttendanceStatus =
  | "pendiente"
  | "tal_vez"
  | "confirmado"
  | "lista_espera"
  | "declinado"
  | "asistio"
  | "no_asistio";
export type PreferredPosition = "portero" | "defensa" | "medio" | "delantero";

export interface Match {
  id: string;
  owner_id: string;
  title: string;
  type: MatchType;
  date: string; // ISO date
  time: string | null;
  location: string | null;
  cost_per_player: number;
  max_players: number | null;
  notes: string | null;
  public_token: string;
  status: MatchStatus;
  list_closed: boolean;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  frequent_player_id: string | null;
  display_name: string;
  amount_due: number;
  amount_paid: number;
  is_goalkeeper: boolean;
  payment_status: PaymentStatus;
  attendance_status: AttendanceStatus;
  confirmed_attendance_at: string | null;
  payment_method: string | null;
  note: string | null;
  reported_at: string | null;
  confirmed_at: string | null;
  paid_by_player_id: string | null;
  created_at: string;
}

export interface FrequentPlayer {
  id: string;
  owner_id: string;
  name: string;
  nickname: string | null;
  phone: string | null;
  skill_level: number | null; // privado
  preferred_position: PreferredPosition | null;
  can_be_goalkeeper: boolean;
  notes: string | null;
  is_active: boolean;
  last_played_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  match_id: string;
  name: string;
  total_score: number;
  published: boolean;
  created_at: string;
}

export interface MatchTemplate {
  id: string;
  owner_id: string;
  name: string;
  type: MatchType;
  time: string | null;
  location: string | null;
  cost_per_player: number;
  max_players: number | null;
  notes: string | null;
  created_at: string;
}

export interface MatchResult {
  match_id: string;
  winner_team_id: string | null;
  mvp_match_player_id: string | null;
  score: string | null;
  notes: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  match_player_id: string;
}

// Placeholder para el genérico de supabase-js.
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
