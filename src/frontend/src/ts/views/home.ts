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
    cardWrapper.className = 'shadow-md rounded-lg p-8';

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


// import { Page } from '../types';
// import { Router } from '../router';

// export class HomePage implements Page {
//   private router: Router;
//   private element: HTMLElement | null = null;
  
//   constructor(router: Router) {
//     this.router = router;
//   }
  
//   render(): HTMLElement {
//     // Return cached element if it exists
//     if (this.element) {
//       return this.element;
//     }
    
//     const container = document.createElement('div');
//     container.innerHTML = `
//       <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
//         <div class="px-4 py-6 sm:px-0">
//           <div class="bg-white shadow-md rounded-lg p-8">
//             <div class="text-center mb-8">
//               <h1 class="text-3xl font-bold text-gray-900">Welcome to Transcendence!</h1>
//               <p class="mt-4 text-lg text-gray-600">
//                 The ultimate online gaming platform. Challenge your friends to a game of Pong or check your stats.
//               </p>
//             </div>
            
//             <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
//               <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
//                 <h2 class="text-xl font-bold text-indigo-600 mb-2">Play Game</h2>
//                 <p class="text-gray-600 mb-4">Challenge a friend or find a random opponent</p>
//                 <a href="/play" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">Play Now</a>
//               </div>
              
//               <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
//                 <h2 class="text-xl font-bold text-indigo-600 mb-2">View Stats</h2>
//                 <p class="text-gray-600 mb-4">Check your game history and rankings</p>
//                 <a href="/stats" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">See Stats</a>
//               </div>
              
//               <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
//                 <h2 class="text-xl font-bold text-indigo-600 mb-2">Profile</h2>
//                 <p class="text-gray-600 mb-4">Update your profile information</p>
//                 <a href="/profile" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">Edit Profile</a>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     `;
    
//     // Cache the element for future use
//     this.element = container;
    
//     return container;
//   }
  
//   update(): void {
//   }
// }
