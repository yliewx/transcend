/*---------------------------------BASE PAGE--------------------------------*/

export interface Page {
    render(): HTMLElement | Promise<HTMLElement>;
    update?(): void | Promise<void>;
    destroy?(): void | Promise<void>;
    setTournamentId?: (id: string) => void;
  }

/*---------------------------------GAME STATE-------------------------------*/

export interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'paused' | 'finished';
  paddleLeftY: number;
  paddleRightY: number;
  ballX: number;
  ballY: number;
  scoreLeft: number;
  scoreRight: number;
  winner?: 'left' | 'right';
  lastUpdateTime: number;
}
  
export interface InputState {
  leftPaddleUp: boolean;
  leftPaddleDown: boolean;
  rightPaddleUp: boolean;
  rightPaddleDown: boolean;
}

/*---------------------------------STATS/RECORDS----------------------------*/

export interface GameStats {
  id: number;
  username: string;
  display_name?: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  current_win_streak: number;
  max_win_streak: number;
  win_percentage: number;
  rank: number | null;
  last_updated: string;
}
  
export interface MatchHistoryItem {
  id: number;
  match_date: string;
  user_name: string;
  opponent_name: string;
  user_score: number;
  opponent_score: number;
  user_won: number;
}

export interface MatchRecord {
  gameId: string;
  userId: number;
  opponentId: number | null;
  winnerId: number | null;
  leftScore: number;
  rightScore: number;
}

export interface LeaderboardPlayer {
  id: number;
  display_name: string | null;
  elo_rating: number;
  rank: number;
  current_win_streak: number;
}

export interface EloHistoryItem {
  id: number;
  elo_rating: number;
  previous_rating: number;
  rating_change: number;
  match_date: string;
  formatted_date: string;
  opponent_name: string;
  result: 'Win' | 'Loss';
}

/*---------------------------------FRIENDS----------------------------------*/

export interface FriendResponse {
  id: number;
  username: string;
  displayName: string;
  online?: boolean;
  status?: string;
}

export interface RequestResponse {
  id: number;
  username: string;
  displayName: string;
  requestType: 'incoming' | 'outgoing';
  status: string;
  requestDate: string;
}

export interface FriendRequestData {
  id: number;
  username?: string;
  displayName?: string;
  requestType?: 'incoming' | 'outgoing';
  status?: string;
  requestDate?: string;
}

export interface FriendRequestMessage {
  friend: FriendResponse;
  request: FriendRequestData;
  requestStatus: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string;
}
