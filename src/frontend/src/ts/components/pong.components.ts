export class PongViewComponents {
  private renderHeader(): string {
    return  `
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Pong Game</h1>
        <p class="mt-2 text-gray-600 mb-4">
        <strong>Controls:</strong> Player 1 (W/S) | Player 2 (↑/↓)
        </p>
        <p id="game-status" class="text-xl text-indigo-600 font-medium"></p>
      </div>
    `;
  }

  private renderModeSelection(): string {
    return  `
      <div id="mode-selection" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Local Mode -->
        <div id="local-mode-container" class="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4 text-center">Local Mode</h2>
          <div class="flex justify-center">
            <button id="create-local-game-btn" class="btn-primary">Create Local Game</button>
          </div>
        </div>

        <!-- Remote Mode -->
        <div id="remote-mode-container" class="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4 text-center">Remote Mode</h2>
          <div class="flex justify-center mb-4">
            <button id="create-remote-game-btn" class="btn-primary mx-2">Create Remote Game</button>
            <button id="join-game-btn" class="btn-success mx-2">Join Game</button>
          </div>

          <div id="join-game-form" class="text-center hidden">
            <div class="flex justify-center items-center">
              <input type="text" id="game-invite-code" placeholder="Enter invite code"
                class="form-input w-64" />
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
      <div id="game-info" class="mb-4 text-center">
        <p>Game ID: <span id="game-id" class="font-mono">-</span></p>
      </div>
    `;
  }

  private renderGameControls(): string {
    return  `
      <div id="game-controls" class="flex justify-center mb-6 hidden">
        <button id="start-game-btn" class="btn-green mx-2">Start</button>
        <button id="pause-game-btn" class="btn-yellow mx-2">Pause/Resume</button>
        <button id="reset-game-btn" class="btn-red mx-2 hidden">Reset</button>
      </div>
    `;
  }

  private renderCanvas(): string {
    return  `
      <div id="pong-canvas-container" class="hidden">
        <canvas id="pong-canvas" width="800" height="600" class="border border-gray-300 rounded-lg shadow-lg bg-black"></canvas>
      </div>
    `;
  }

  private renderFooterNote(): string {
    return  `
      <div class="mt-6 text-center text-gray-500">
        <p>This is a server-side implementation of Pong. The game logic runs entirely on the server.</p>
      </div>
    `;
  }

  render(): string {
    return `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
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
