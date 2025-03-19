import { Page } from '../types';
import { Router } from '../router';
import { AuthService } from '../services/auth_service';

export class HeaderPage implements Page {
  private router: Router;
  private authService: AuthService;

  constructor(router: Router) {
    this.router = router;
    this.authService = this.router.getAuthService();
  }

  render(): HTMLElement {  
    const header = document.createElement('header');
    header.className = 'bg-white shadow';
    
    // Only render authenticated header
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <a href="/home" class="nav-link text-xl font-bold text-indigo-600">Transcend</a>
            </div>
            <div class="hidden md:ml-6 md:flex md:space-x-8">
              <a href="/play" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Play
              </a>
              <a href="/stats" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Stats
              </a>
              <a href="/profile" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Profile
              </a>
            </div>
          </div>
          <div class="ml-6 flex items-center">
            <button id="logout-button" class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Logout
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add logout handler
    setTimeout(() => {
      const logoutButton = document.getElementById('logout-button');
      if (logoutButton) {
        logoutButton.addEventListener('click', () => this.performLogout());
      }
    }, 0);
    
    return header;
  }

  private async performLogout(): Promise<void> {
    try {
      const result = await this.authService.logout();
      
      if (!result.success) {
        console.error('Logout failed:', result.error);
      }
      // No need to navigate or set authentication state - AuthService handles that
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}