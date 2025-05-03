import { BaseApiService } from "./base.api";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  current_participants?: number;
  created_at: string;
  participant_status: string;
  alias?: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: number | null;
  player2_id: number | null;
  player1_username?: string;
  player2_username?: string;
  player1_alias?: string;
  player2_alias?: string;
  winner_id: number | null;
  match_date: string | null;
  game_id: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TournamentParticipant {
  id: number;
  username: string;
  alias?: string;
  status?: string;
}

export interface CreateTournamentData {
  name: string;
  description: string;
  max_participants: number;
}

export class TournamentService extends BaseApiService {
  public async getTournaments(): Promise<{ success: boolean, tournaments?: Tournament[], error?: string }> {
    return this.request<{ tournaments: Tournament[] }>(
      '/tournaments',
      'GET',
      undefined,
      true
    );
  }

  public async getUserTournaments(): Promise<{ success: boolean, tournaments?: Tournament[], error?: string }> {
    return this.request<{ tournaments: Tournament[] }>(
      '/user/tournaments',
      'GET',
      undefined,
      true
    );
  }

  public async getTournamentDetails(tournamentId: string | null): Promise<{ 
    success: boolean, 
    tournament?: Tournament, 
    matches?: TournamentMatch[],
    participants?: TournamentParticipant[],
    error?: string 
  }> {
    return this.request<{ 
      tournament: Tournament, 
      matches: TournamentMatch[],
      participants: TournamentParticipant[]
    }>(
      `/tournaments/${tournamentId}`,
      'GET',
      undefined,
      true
    );
  }

  public async registerForTournament(tournamentId: string | null, alias: string): Promise<{ 
    success: boolean, 
    message?: string, 
    error?: string, 
    tournament_started?: boolean 
  }> {
    return this.request<{ message: string, tournament_started?: boolean }>(
      `/tournaments/${tournamentId}/register`,
      'POST',
      { alias },
      true
    );
  }

  public async joinTournamentMatch(matchId: number): Promise<{ success: boolean, gameId?: string, error?: string }> {
    return this.request<{ gameId: string }>(
      `/tournaments/matches/${matchId}/join`,
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );
  }

  public async createTournament(tournamentData: CreateTournamentData): Promise<{ 
    success: boolean, 
    tournamentId?: number,
    message?: string, 
    error?: string 
  }> {
    return this.request<{ success: boolean, tournamentId: number, message: string }>(
      '/admin/tournaments',
      'POST',
      tournamentData,
      true
    );
  }
}