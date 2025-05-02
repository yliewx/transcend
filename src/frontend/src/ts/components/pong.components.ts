export class PongViewComponents {
  private renderHeader(): string {
    return  `
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Pong Game</h1>
        <p id="local-key-controls" class="hidden mt-2 text-gray-600 dark:text-gray-400 mb-4">
          <strong>Controls:</strong> Player 1 (W/S) | Player 2 (↑/↓)
        </p>
        <p id="remote-key-controls" class="hidden mt-2 text-gray-600 dark:text-gray-400 mb-4">
          <strong>Controls:</strong> Player 1 (↑/↓) | Player 2 (↑/↓)
        </p>
        <p id="game-status" class="text-xl text-pink-600 dark:text-pink-400 font-medium"></p>
      </div>
    `;
  }

  private renderModeSelection(): string {
    return  `
      <div id="mode-selection" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Local Mode -->
        <div id="local-mode-container" class="card">
          <h2 class="card-title">Local Mode</h2>
          <p class="card-description"><strong>Controls:</strong> Player 1 (W/S) | Player 2 (↑/↓)</p>
          <div class="flex justify-center">
            <button id="create-local-game-btn" class="card-button">Create Game</button>
          </div>
        </div>

        <!-- Remote Mode -->
        <div id="remote-mode-container" class="card">
          <h2 class="card-title">Remote Mode</h2>
          <p class="card-description"><strong>Controls:</strong> Player 1 (↑/↓) | Player 2 (↑/↓)</p>
          <div class="flex justify-center mb-4">
            <button id="create-remote-game-btn" class="card-button mx-2">Create Game</button>
            <button id="join-game-btn" class="btn-green mx-2">Join Game</button>
          </div>

          <div id="join-game-form" class="text-center hidden">
            <div class="flex justify-center items-center">
              <input type="text" id="game-invite-code" placeholder="Enter invite code" maxlength="50" required
                class="form-input w-64 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 border dark:border-gray-700" />
              <button id="submit-join-game-btn" class="btn-blue ml-2">Join</button>
              <button id="cancel-join-game-btn" class="btn-gray ml-2">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGameInfo(): string {
    return  `
      <div id="game-info" class="mb-4 text-center text-gray-700 dark:text-gray-300">
        <p>Game ID: <span id="game-id" class="font-mono">-</span></p>
      </div>
    `;
  }

  private renderGameControls(): string {
    return  `
      <div id="game-controls" class="flex justify-center mb-6 hidden">
        <button id="start-game-btn" class="btn-green mx-2">Start</button>
        <button id="pause-game-btn" class="btn-yellow mx-2">Pause</button>
        <button id="reset-game-btn" class="btn-red mx-2">Reset</button>
        <button id="cli-btn" class="btn-blue mx-2">CLI Token</button>
      </div>
    `;
  }

  private renderCanvas(): string {
    return  `
    <div id="pong-canvas-container" class="hidden flex justify-center items-center min-h-[600px]">
      <canvas id="pong-canvas" width="800" height="600"
        class="border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg bg-black"></canvas>
    </div>
    `;
  }

  private renderFooterNote(): string {
    return  `
      <div class="mt-6 text-center text-gray-500 dark:text-gray-400">
        <p>This is a server-side implementation of Pong. The game logic runs entirely on the server.</p>
      </div>
    `;
  }

  render(): string {
    return `
      <div class="px-4 py-6 sm:px-0">
        <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
          ${this.renderHeader()}
          ${this.renderModeSelection()}
          ${this.renderGameInfo()}
          ${this.renderGameControls()}
          ${this.renderCanvas()}
          ${this.renderFooterNote()}
        </div>
      </div>
    `;
  }
}
