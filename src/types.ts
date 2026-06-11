/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Profile {
  id: string;
  auth_user_id?: string;
  nome: string;
  apelido: string;
  email: string;
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  flag_url?: string;
  code: string; // e.g. "BRA", "ARG", "FRA"
  group_id: string;
}

export interface Group {
  id: string;
  name: string; // e.g. "Grupo A", "Grupo B"
}

export interface Match {
  id: number;
  home_team_id: string;
  away_team_id: string;
  home_team_score?: number;
  away_team_score?: number;
  match_time: string;
  status: 'scheduled' | 'live' | 'finished';
  stage: 'group' | 'round_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final';
  group_id?: string;
  stadium?: string;
  city?: string;
  // Included from join
  home_team?: Team;
  away_team?: Team;
}

export interface GroupStanding {
  id: number;
  group_id: string;
  team_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  // Joined
  team?: Team;
}

export interface KnockoutBracket {
  id: number;
  stage: string;
  match_id: number;
  home_source?: string; // e.g. "1A"
  away_source?: string; // e.g. "2B"
  winner_to?: number; // match_id of next stage
}

export interface Prediction {
  id: number;
  user_id: string;
  match_id: string;
  home_score_guess: number;
  away_score_guess: number;
  pool_id?: string;
  predicted_winner_team_id?: string | null;
  predicted_draw?: boolean;
  status?: string;
  points?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Pool {
  id: string;
  nome: string;
  descricao?: string;
  codigo_convite: string;
  owner_user_id: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  joined_at?: string;
  // Joined profile info for scoreboard
  apelido?: string;
  nome?: string;
}

export interface Ranking {
  id: string;
  user_id: string;
  apelido: string;
  nome?: string;
  total_points: number;
  exact_scores: number;
  correct_teams: number; // Correct winner but wrong score
  predictions_count: number;
}

// Views correspond to specialized structures returned by vw_* views
export interface VwWorldcupMatchApp {
  match_id: number;
  id?: string;
  match_time?: string;
  utc_date?: string;
  status: string;
  stage: string;
  stadium?: string;
  city?: string;
  group_letter?: string;
  
  home_team_name: string;
  away_team_name: string;
  home_team_tla: string;
  away_team_tla: string;
  home_team_crest_url?: string;
  away_team_crest_url?: string;
  
  brasilia_date_text?: string;
  brasilia_time_text?: string;
  brasilia_datetime_text?: string;
  
  home_score?: number;
  away_score?: number;

  user_prediction_home?: number;
  user_prediction_away?: number;
  prediction_points?: number;
}

export interface VwWorldcupGroupApp {
  group_letter: string;
  group_name: string;
  teams_count: number;
  teams: any; // JSON containing array of official teams/standings
}

export interface VwWorldcupTeamApp {
  name: string;
  team_name_display?: string;
  short_name?: string;
  tla: string;
  crest_url?: string;
  group_letter: string;
}

export interface VwPoolRankingApp {
  pool_id: string;
  pool_nome: string;
  codigo_convite?: string;
  user_id: string;
  user_nome: string;
  user_apelido?: string;
  total_palpites: number;
  total_pontos: number;
  acertos_exatos: number;
  acertos_com_pontos: number;
  ultimo_palpite_em?: string;
  posicao?: number;
}
