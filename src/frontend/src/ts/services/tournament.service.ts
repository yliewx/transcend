import { BaseApiService } from "./base.api";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  current_participants?: number;
  created_at: string;
  participant_status: string;
  alias?: string; // Player's alias in this tournament
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
  elo: number;
  alias?: string;
  status?: string;
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

  // Register for a tournament with alias
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