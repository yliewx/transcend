import { BaseApiService } from "./base.api";
import { GameState } from "../types";

interface ExistingGameResponse {
  hasExistingGame: boolean,
  gameId?: string,
  gameMode?: 'local' | 'remote',
  state?: GameState,
  isCreator?: boolean,
  isTourMatch?: boolean,
  message?: string
}

export class PongGameService extends BaseApiService {
  public async createGame(mode: 'local' | 'remote'): Promise<{success: boolean, gameId?: string, error?: string}> {
    return this.request<{gameId?: string}>(
      '/game/create',
      'POST',
      { mode },
      true
    );
  }

  public async getExistingGame(playerId: number): Promise<ExistingGameResponse> {
    return this.request<ExistingGameResponse>(
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