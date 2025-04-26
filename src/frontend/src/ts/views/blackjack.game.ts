import { Page } from '../types';
import { Router } from '../router';
import { BlackjackGame } from './blackjack.logic'; // Import the BlackjackGame class

export class BlackjackGamePage implements Page {
  private router: Router;
  private blackjackGame: BlackjackGame;

  constructor(router: Router) {
    this.router = router;
    this.blackjackGame = new BlackjackGame(); // Initialize the Blackjack game logic
  }

  render(): HTMLElement {
    // Create the container for the page
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';

    // Set the innerHTML for the game UI
    container.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-900">Blackjack Game</h1>
      <div class="mt-6">
        <div id="game-output" class="mt-4 p-4 border rounded bg-gray-100">
          Welcome to Blackjack!
        </div>
        <button
          id="start-button"
          class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Start Game
        </button>
        <button
          id="hit-button"
          class="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          disabled
        >
          Hit
        </button>
        <button
          id="stand-button"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          disabled
        >
          Stand
        </button>
        <button
          id="restart-button"
          class="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          disabled
        >
          Restart
        </button>
      </div>
    `;

    // Add event listeners for buttons
    const output = container.querySelector('#game-output') as HTMLElement;
    const nameInput = container.querySelector('#player-name') as HTMLInputElement;
    const startButton = container.querySelector('#start-button') as HTMLButtonElement;
    const hitButton = container.querySelector('#hit-button') as HTMLButtonElement;
    const standButton = container.querySelector('#stand-button') as HTMLButtonElement;
    const restartButton = container.querySelector('#restart-button') as HTMLButtonElement;

    startButton.addEventListener('click', () => {
      output.innerHTML = this.blackjackGame.playGame();
      hitButton.disabled = false;
      standButton.disabled = false;
      restartButton.disabled = false;
      startButton.disabled = true;
    });

    hitButton.addEventListener('click', () => {
      output.innerHTML = this.blackjackGame.playerHit();
      if (this.blackjackGame['playerSum'] > 21) {
        hitButton.disabled = true;
        standButton.disabled = true;
      }
    });

    standButton.addEventListener('click', () => {
      const dealerResult = this.blackjackGame.dealerPlay();
      const winner = this.blackjackGame.determineWinner();
      output.innerHTML = `${dealerResult}<br>${winner}`;
      hitButton.disabled = true;
      standButton.disabled = true;
    });

    restartButton.addEventListener('click', () => {
      this.blackjackGame = new BlackjackGame(); // Reset the game logic
      output.innerHTML = 'Welcome to Blackjack!';
      hitButton.disabled = true;
      standButton.disabled = true;
      restartButton.disabled = true;
      startButton.disabled = false;
      nameInput.value = '';
    });

    return container;
  }
}