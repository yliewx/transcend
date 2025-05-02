import { Page } from '../types';
import { Router } from '../router';
import { CardComponent } from '../components/card';

export class HomePage implements Page {
  private router: Router;
  private element: HTMLElement | null = null;
  
  constructor(router: Router) {
    this.router = router;
  }

  render(): HTMLElement {
    if (this.element) return this.element;

    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';

    const inner = document.createElement('div');
    inner.className = 'px-4 py-6 sm:px-0';

    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'dark:bg-gray-900 shadow-md rounded-lg p-8';

    const header = document.createElement('div');
    header.className = 'text-center mb-8';
    header.innerHTML = `
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Transcendence!</h1>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
        The ultimate online gaming platform. Challenge your friends to a game of Pong or check your stats.
      </p>
    `;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 mt-10';

    const cards = [
      new CardComponent('Play Game', 'Challenge a friend or find a random opponent', 'Play Now', '/play'),
      new CardComponent('View Stats', 'Check your game history and rankings', 'See Stats', '/stats'),
      new CardComponent('Profile', 'Update your profile information', 'Edit Profile', '/profile'),
    ];

    cards.forEach(card => grid.appendChild(card.render()));

    cardWrapper.appendChild(header);
    cardWrapper.appendChild(grid);
    inner.appendChild(cardWrapper);
    container.appendChild(inner);

    this.element = container;
    return container;
  }

  update(): void {}
}