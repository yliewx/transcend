// views/play/index.ts
import { Page } from '../types';
import { Router } from '../router';
import { PongGamePage } from './pong.game';

export class PlayPage implements Page {
  private router: Router;
  private pongGame: PongGamePage;
  
  constructor(router: Router) {
    this.router = router;
    this.pongGame = new PongGamePage(router);
  }
  
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    const header = document.createElement('div');
    header.className = 'px-4 py-6 sm:px-0 mb-6';
    header.innerHTML = `
      <h1 class="text-3xl font-bold text-gray-900">Play Pong</h1>
      <p class="mt-2 text-gray-600">Challenge your friends to a game of Pong right in your browser!</p>
    `;
    
    container.appendChild(header);
    
    // Render the Pong game
    const gameElement = this.pongGame.render();
    container.appendChild(gameElement);
    
    return container;
  }
  
  // Clean up resources when navigating away
  destroy(): void {
    this.pongGame.destroy();
  }
}