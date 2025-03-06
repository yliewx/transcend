// src/app.ts
import { Router } from './router';
import { Route } from './types';
import { createNavbar } from './components/navbar';
import { createHomePage } from './components/home';
import { createLoginPage } from './components/login'; // Assuming you renamed about.ts to login.ts
import { createChatPage } from './components/chat';
import { createPongPage } from './components/pong';
import { createNotFoundPage } from './components/notFound';

// Initialize app
function initApp(): void {
  // Create app container
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found!');
    return;
  }
  
  // Create layout
  const navbar = createNavbar();
  const contentContainer = document.createElement('div');
  contentContainer.className = 'content-container';
  
  appContainer.appendChild(navbar);
  appContainer.appendChild(contentContainer);
  
  // Define routes
  const routes: Route[] = [
    { path: '/', component: createHomePage, title: 'Home | TypeScript SPA' },
    { path: '/login', component: createLoginPage, title: 'Login | TypeScript SPA' },
    { path: '/chat', component: createChatPage, title: 'Live Chat | TypeScript SPA' },
    { path: '/play', component: createPongPage, title: 'Pong Game | TypeScript SPA' },
    { path: '*', component: createNotFoundPage, title: 'Not Found | TypeScript SPA' }
  ];
  
  // Initialize router
  const router = new Router(routes, contentContainer);
  router.init();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export for bundling
export { initApp };