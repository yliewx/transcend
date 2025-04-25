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

  public async generateCLIToken(): Promise<{success: boolean, message?: string, error?: string}> {
    return this.request<{success: boolean, message?: string, error?: string}>(
      '/cli/generate',
      'POST',
      undefined,
      true,
      { omitContentType: true }
    );
  }
}