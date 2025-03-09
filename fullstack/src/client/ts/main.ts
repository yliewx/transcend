import { Router } from './router';
import { LoginView } from './views/login';
import { RegisterView } from './views/register';
import { ApiService } from './services/api';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get app container
  const appContainer = document.getElementById('app') as HTMLElement;
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  // Initialize API service
  const apiService = new ApiService();

  // Define routes
  const routes = {
    '/': 'login',
    '/login': 'login',
    '/register': 'register'
  };

  // Initialize router
  const router = new Router({
    appContainer,
    routes,
    notFoundRoute: 'login'
  });

  // Register view handlers
  router.addHandler('login', (container) => {
    const loginView = new LoginView(container, router);
    loginView.render();
  });

  router.addHandler('register', (container) => {
    const registerView = new RegisterView(container, router, apiService);
    registerView.render();
  });

  // Initialize router
  router.init();
});