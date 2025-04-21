import { Page } from '../types';
import { Router } from '../router';
import { ControlAccess } from '../services/control.access';

export class HeaderPage implements Page {
  private router: Router;
  private controlAccess: ControlAccess;
  private element: HTMLElement | null = null;

  constructor(router: Router) {
    this.router = router;
    this.controlAccess = this.router.getControlAccess();
  }

  render(): HTMLElement {
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
  
    const header = document.createElement('header');
    header.className = 'bg-white shadow';
    
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
              <a href="/tournaments" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Tournaments
              </a>
              <a href="/my-tournaments" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                My Tournaments
              </a>
              <a href="/admin-tournaments" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Admin Tournaments
              </a>
              <a href="/stats" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Stats
              </a>
              <a href="/profile" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Profile
              </a>
              <a href="/friends" class="nav-link border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Friends
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
    
    header.querySelector('#logout-button')?.addEventListener('click', () => this.performLogout());

    // Cache the element for future use
    this.element = header;
    
    return header;
  }


  private async performLogout(): Promise<void> {
    try {
      const result = await this.controlAccess.logout();
      
      if (!result.success) {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  update(): void {
    if (this.element) {
      const currentPath = this.router.getCurrentPath();
      this.updateActiveNavItem(currentPath);
    }
  }
  
  private updateActiveNavItem(path: string): void {
    if (!this.element) return;
    
    const navLinks = this.element.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).getAttribute('href');
      if (href && href !== '/home') { // Skip the logo link
        const isActive = href === path;
        
        // Toggle classes based on whether this link matches the current path
        link.classList.toggle('text-indigo-700', isActive);
        link.classList.toggle('border-indigo-500', isActive);
        link.classList.toggle('text-gray-500', !isActive);
        link.classList.toggle('border-transparent', !isActive);
      }
    });
  }
}