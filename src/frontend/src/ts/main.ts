import { Page } from './types';
import { Router } from './router';
import { LoginPage } from './views/login';
import { RegisterPage } from './views/register';
import { HomePage } from './views/home';
import { ProfilePage } from './views/profile';
import { PageWithHeader } from './views/layout';
import { AuthService } from './services/auth.service';
import { ControlAccess } from './services/control.access';
import { UserService } from './services/user.service';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize application dependencies
  const appContainer = document.getElementById('app') as HTMLElement;
  const controlAccess = new ControlAccess(new AuthService());
  const userService = new UserService();
  
  // Create router instance with auth service
  const router = new Router(appContainer, controlAccess);
  
  // Register routes with Page implementations
  // Auth pages
  router.addRoute('/login', new LoginPage(router));
  router.addRoute('/register', new RegisterPage(router));
  
  // Protected pages with header
  router.addRoute('/', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/home', new PageWithHeader(new HomePage(router), router));
  router.addRoute('/profile', new PageWithHeader(new ProfilePage(router, userService), router));
  
  // Placeholder routes
  router.addRoute('/play', new PageWithHeader(new PlaceholderPage('Play Game', 'This feature is coming soon!'), router));
  router.addRoute('/stats', new PageWithHeader(new PlaceholderPage('Game Stats', 'Stats feature is under development.'), router));
  
  // 404 route
  router.addRoute('/404', new PageWithHeader(new NotFoundPage(), router));
  
  // Start the router
  router.init(controlAccess.isLoggedIn() ? '/home' : '/login');
});

// Placeholder Page class for routes under development
class PlaceholderPage implements Page {
  private title: string;
  private message: string;
  
  constructor(title: string, message: string) {
    this.title = title;
    this.message = message;
  }
  
  render(): HTMLElement {
    const container = document.createElement('div');
    
    container.innerHTML = `
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow-md rounded-lg p-8 flex flex-col items-center justify-center h-96">
            <h1 class="text-3xl font-bold text-gray-900 mb-4">${this.title}</h1>
            <p class="text-xl text-gray-600 mb-8">${this.message}</p>
            <a href="/home" class="nav-link px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    `;
    
    return container;
  }
}

// NotFoundPage class
class NotFoundPage implements Page {
  render(): HTMLElement {
    const container = document.createElement('div');
    
    container.innerHTML = `
      <div class="flex items-center justify-center h-screen">
        <div class="text-center">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p class="text-xl text-gray-600 mb-8">Page not found</p>
          <button class="nav-link px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onclick="window.history.back()">
            Go Back
          </button>
        </div>
      </div>
    `;
    
    return container;
  }
}