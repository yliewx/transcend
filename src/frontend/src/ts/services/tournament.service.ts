import { BaseApiService } from "./base.api";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  max_participants: number;
  current_participants?: number;
  created_at: string;
  participant_status: string;
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
  winner_id: number | null;
  match_date: string | null;
  game_id: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export class TournamentService extends BaseApiService {
  // Get list of all available tournaments
  public async getTournaments(): Promise<{ success: boolean, tournaments?: Tournament[], error?: string }> {
    return this.request<{ tournaments: Tournament[] }>(
      '/tournaments',
      'GET',
      undefined,
      true
    );
  }

  // Get a specific tournament details
  public async getTournamentDetails(tournamentId: string | null): Promise<{ 
    success: boolean, 
    tournament?: Tournament, 
    matches?: TournamentMatch[],
    participants?: {id: number, username: string, elo: number}[],
    error?: string 
  }> {
    return this.request<{ 
      tournament: Tournament, 
      matches: TournamentMatch[],
      participants: {id: number, username: string, elo: number}[]
    }>(
      `/tournaments/${tournamentId}`,
      'GET',
      undefined,
      true
    );
  }

  // Register for a tournament
  public async registerForTournament(tournamentId: string | null): Promise<{ success: boolean, message?: string, error?: string }> {
    return this.request<{ message: string }>(
      `/tournaments/${tournamentId}/register`,
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );
  }

  // Unregister from a tournament
  public async unregisterFromTournament(tournamentId: string | null): Promise<{ success: boolean, message?: string, error?: string }> {
    return this.request<{ message: string }>(
      `/tournaments/${tournamentId}/unregister`,
      'DELETE',
      undefined,
      true,
      { omitContentType: true}
    );
  }

  // Get user's tournaments
  public async getUserTournaments(): Promise<{ success: boolean, tournaments?: Tournament[], error?: string }> {
    return this.request<{ tournaments: Tournament[] }>(
      '/user/tournaments',
      'GET',
      undefined,
      true
    );
  }

  // Join tournament match
  public async joinTournamentMatch(matchId: number): Promise<{ success: boolean, gameId?: string, error?: string }> {
    return this.request<{ gameId: string }>(
      `/tournaments/matches/${matchId}/join`,
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );
  }
}