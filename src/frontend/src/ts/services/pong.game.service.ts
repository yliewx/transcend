import { BaseApiService } from "./base.api";
import { GameState, MatchRecord } from "../types";

export class PongGameService extends BaseApiService {
  /**
   * Create a new pong game
   */
  public async createGame(mode: 'local' | 'remote'): Promise<{success: boolean, gameId?: string, error?: string}> {
    return this.request<{gameId?: string}>(
      '/game/create',
      'POST',
      { mode },
      true
    );
  }

  public async getExistingGame(playerId: number): Promise<{success: boolean, gameId?: string, gameMode?: 'local' | 'remote', isCreator?: boolean, message?: string}> {
    return this.request<{success: boolean, gameId?: string, gameMode?: 'local' | 'remote', isCreator?: boolean, message?: string}>(
      '/game/restore',
      'GET',
      undefined,
      true,
      { omitContentType: true }
    );
  }

  /**
   * Start a game with the given ID
   */
  // public async startGame(gameId: string): Promise<{success: boolean, error?: string}> {
  //   return this.request<{}>(
  //     `/games/${gameId}/start`,
  //     'POST',
  //     undefined,
  //     true,
  //     { omitContentType: true}
  //   );
  // }

  /**
   * Pause or resume a game with the given ID
   */
  // public async pauseGame(gameId: string): Promise<{success: boolean, status?: string, error?: string}> {
  //   return this.request<{status?: string}>(
  //     `/games/${gameId}/pause`,
  //     'POST',
  //     undefined,
  //     false,
  //     { omitContentType: true}
  //   );
  // }

  /**
   * Poll for game state updates, optionally providing input state
   */
  // public async pollGameState(
  //   url: string,
  //   requestBody?: any
  // ): Promise<{success: boolean, state?: GameState, hash?: string, error?: string}> {
  //   return requestBody 
  //     ? this.request<{state?: GameState, hash?: string}>(
  //         url,
  //         'POST',
  //         requestBody,
  //         false
  //       )
  //     : this.request<{state?: GameState, hash?: string}>(
  //         url,
  //         'POST',
  //         undefined,
  //         false,
  //         { omitContentType: true }
  //       );
  // }

  /**
   * Record a match result
   */
  // public async recordMatchResult(matchData: MatchRecord): Promise<{success: boolean, error?: string}> {
  //   return this.request<{}>(
  //     '/games/record-match',
  //     'POST',
  //     matchData,
  //     false
  //   );
  // }

  /**
   * Clean up a game when no longer needed
   */
  // public async cleanupGame(gameId: string): Promise<{success: boolean, error?: string}> {
  //   return this.request<{}>(
  //     `/games/${gameId}`,
  //     'DELETE',
  //     undefined,
  //     false
  //   );
  // }
}