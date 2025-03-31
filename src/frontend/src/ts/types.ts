export interface Page {
    render(): HTMLElement | Promise<HTMLElement>;
    update?(): void | Promise<void>;
    destroy?(): void | Promise<void>;
  }

export interface GameStats {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    winRate: string | number;
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

export interface FriendResponse {
    id: number;
    username: string;
    displayName: string;
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