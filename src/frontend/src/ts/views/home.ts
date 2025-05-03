import { Page } from '../types';
import { Router } from '../router';
import { CardComponent } from '../components/card';
import { ImageCardComponent } from '../components/image.card';
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
    inner.className = 'px-4 py-6 sm:px-0 relative';

    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'bg-transparent shadow-md rounded-lg p-8';

    const banner = document.createElement('div');
    banner.className = `
      relative w-full h-72 bg-contain bg-no-repeat bg-center rounded-lg 
      opacity-0 animate-fade-slide-in
    `;
    banner.style.backgroundImage = `url('/assets/banner.png')`;
    banner.style.animationDelay = '0s';
    banner.style.marginTop = '3rem';
    banner.style.zIndex = '0';

    const textContainer = document.createElement('div');
    textContainer.className = `
      absolute left-1/2 transform -translate-x-1/2 text-center z-10 mt-4 sm:mt-8
    `;
    
    const bannerText = document.createElement('h1');
    bannerText.className = `
      text-3xl font-bold text-gray-900 dark:text-pink-400 
      bg-black bg-opacity-20 px-4 py-2 rounded-lg
    `;
    bannerText.textContent = 'Welcome to Parsley Pong!';

    textContainer.appendChild(bannerText);
    inner.appendChild(textContainer);
    inner.appendChild(banner);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-10';

    const imageCards = [
      new ImageCardComponent('Play', '/assets/play.jpg', '/play', '0.1s'),
      new ImageCardComponent('Tournaments', '/assets/tournament.jpg', '/tournaments', '0.2s'),
      new ImageCardComponent('Profile', '/assets/profile.jpg', '/profile', '0.3s'),
      new ImageCardComponent('Stats', '/assets/stats.jpg', '/stats', '0.4s'),
    ];

    imageCards.forEach(card => grid.appendChild(card.render()));
    cardWrapper.appendChild(grid);

    inner.appendChild(cardWrapper);
    container.appendChild(inner);

    this.element = container;
    return container;
  }

  update(): void {}
}
