import { BaseApiService } from "./base.api";
import { GameStats, MatchHistoryItem, LeaderboardPlayer, EloHistoryItem } from "../types";

// export class GameStatsService extends BaseApiService {
//   /**
//    * Get game statistics for a user
//    */
//   public async getGameStats(userId: number): Promise<{success: boolean, stats?: GameStats, error?: string}> {
//     const response = await this.request<{stats?: GameStats, error?: string}>(
//       `/user/game-stats?userId=${userId}`, 
//       'GET', 
//       undefined, 
//       true
//     );
    
//     if (response.success) {
//       return {
//         success: true,
//         stats: response.stats
//       };
//     }
    
//     return response;
//   }
  
//   /**
//    * Get match history for a user
//    */
//   public async getMatchHistory(userId: number): Promise<{success: boolean, matchHistory?: MatchHistoryItem[], error?: string}> {
//     const response = await this.request<{matchHistory?: MatchHistoryItem[], error?: string}>(
//       `/user/match-history?userId=${userId}`, 
//       'GET', 
//       undefined, 
//       true
//     );
    
//     if (response.success) {
//       return {
//         success: true,
//         matchHistory: response.matchHistory
//       };
//     }
    
//     return response;
//   }
// }


export class GameStatsService extends BaseApiService {
 
  public async getGameStats(): Promise<{success: boolean, stats?: GameStats, error?: string}> {
    const response = await this.request<{success: boolean, stats?: GameStats, error?: string}>(
      '/user/game-stats', 
      'GET', 
      undefined, 
      true
    );
    
    return response;
  }
  

  public async getMatchHistory(): Promise<{success: boolean, matchHistory?: MatchHistoryItem[], error?: string}> {
    const response = await this.request<{success: boolean, matchHistory?: MatchHistoryItem[], error?: string}>(
      '/user/match-history', 
      'GET', 
      undefined, 
      true
    );
    
    return response;
  }
  
  public async getLeaderboard(): Promise<{success: boolean, leaderboard?: LeaderboardPlayer[], error?: string}> {
    const response = await this.request<{success: boolean, leaderboard?: LeaderboardPlayer[], error?: string}>(
      `/user/leaderboard`, 
      'GET', 
      undefined, 
      true
    );
    
    return response;
  }

  public async getEloHistory(): Promise<{ success: boolean; eloHistory?: EloHistoryItem[]; error?: string}> {
    const response = await this.request<{ success: boolean; eloHistory?: EloHistoryItem[]; error?: string }>(
      `/user/elo-history`, 
      'GET', 
      undefined, 
      true
    );
    
    return response;
  }


}