export interface Page {
    render(): HTMLElement | Promise<HTMLElement>;
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