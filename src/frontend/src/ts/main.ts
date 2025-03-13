// app.ts or index.ts
import { Router } from './router';
import { LoginView } from './views/login';
import { RegisterView } from './views/register';
import { HomeView } from './views/home';
import { ProfileView } from './views/profile';
import { ApiService } from './services/api';

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app') as HTMLElement;
  const apiService = new ApiService();
  
  // Create router with routes configuration
  const router = new Router({
    appContainer,
    routes: {
      '/': 'home',
      '/home': 'home',
      '/login': 'login',
      '/register': 'register',
      '/play': 'play',
      '/stats': 'stats',
      '/profile': 'profile'
    },
    notFoundRoute: 'notFound'
  }, apiService);
  

  // Add route handlers
  router.addHandler('login', (container) => {
    const loginView = new LoginView(container, router, apiService);
    loginView.render();
  });
  
  router.addHandler('register', (container) => {
    const registerView = new RegisterView(container, router, apiService);
    registerView.render();
  });
  
  router.addHandler('home', (container) => {
    const homeView = new HomeView(container, router, apiService);
    homeView.render();
  });
  
  // Placeholder handlers for future implementation
  router.addHandler('play', (container) => {
    renderPlaceholder(container, 'Play Game', 'This feature is coming soon!');
  });
  
  router.addHandler('stats', (container) => {
    renderPlaceholder(container, 'Game Stats', 'Stats feature is under development.');
  });
  
  router.addHandler('profile', (container) => {
    const profile = new ProfileView(container, router, apiService);
    profile.render(); 
  });
  
  router.addHandler('notFound', (container) => {
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
  });
  
  // Initialize router
  router.init();
});

// Helper function for placeholder pages
function renderPlaceholder(container: HTMLElement, title: string, message: string): void {
  container.innerHTML = `
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8 flex flex-col items-center justify-center h-96">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">${title}</h1>
          <p class="text-xl text-gray-600 mb-8">${message}</p>
          <a href="/home" class="nav-link px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  `;
}