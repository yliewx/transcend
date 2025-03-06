// src/app.ts
import { Router } from './router';
import { createNavbar } from './components/navbar';
import { createHomePage } from './components/home';
import { createAboutPage } from './components/about';
import { createNotFoundPage } from './components/notFound';
// Initialize app
function initApp() {
    // Create app container
    const appContainer = document.getElementById('app');
    if (!appContainer) {
        throw new Error('App container not found!');
    }
    // Create layout
    const navbar = createNavbar();
    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';
    appContainer.appendChild(navbar);
    appContainer.appendChild(contentContainer);
    // Define routes
    const routes = [
        { path: '/', component: createHomePage, title: 'Home | TypeScript SPA' },
        { path: '/about', component: createAboutPage, title: 'About | TypeScript SPA' },
        { path: '*', component: createNotFoundPage, title: 'Not Found | TypeScript SPA' }
    ];
    // Initialize router
    const router = new Router(routes, contentContainer);
    router.init();
}
// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
// Export this as the entry point
export { initApp };
//# sourceMappingURL=app.js.map