import { Router } from '../router';
import { ApiService } from '../services/api';

export class HomeView {
  private container: HTMLElement;
  private router: Router;
  private apiService: ApiService;
  
  constructor(container: HTMLElement, router: Router, apiService: ApiService) {
    this.container = container;
    this.router = router;
    this.apiService = apiService;
  }
  
  public render(): void {
    this.container.innerHTML = `
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900">Welcome to Transcendence!</h1>
              <p class="mt-4 text-lg text-gray-600">
                The ultimate online gaming platform. Challenge your friends to a game of Pong or check your stats.
              </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
                <h2 class="text-xl font-bold text-indigo-600 mb-2">Play Game</h2>
                <p class="text-gray-600 mb-4">Challenge a friend or find a random opponent</p>
                <a href="/play" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">Play Now</a>
              </div>
              
              <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
                <h2 class="text-xl font-bold text-indigo-600 mb-2">View Stats</h2>
                <p class="text-gray-600 mb-4">Check your game history and rankings</p>
                <a href="/stats" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">See Stats</a>
              </div>
              
              <div class="bg-indigo-50 p-6 rounded-lg text-center hover:shadow-lg transition duration-200">
                <h2 class="text-xl font-bold text-indigo-600 mb-2">Profile</h2>
                <p class="text-gray-600 mb-4">Update your profile information</p>
                <a href="/profile" class="nav-link inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">Edit Profile</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}