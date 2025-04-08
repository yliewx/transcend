import { Page } from './types';
import { ControlAccess } from './services/control.access';
import { WebSocketManager } from './services/websocket.manager';

export class Router {
  private routes: Map<string, Page>;
  private container: HTMLElement;
  private currentPath: string = '';
  private protectedRoutes: string[] = ['/home', '/play', '/stats', '/profile', '/friends'];
  private wss: WebSocketManager;

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(container: HTMLElement, private controlAccess: ControlAccess) {
    this.routes = new Map();
    this.container = container;
    
    // Create websocket connection to server
    this.wss = new WebSocketManager(process.env.BASE_WSS_URL as string);
    this.wss.connect();

    // Handle popstate events (browser back/forward buttons)
    window.addEventListener('popstate', (event) => {
      const newPath = window.location.pathname;
      if (newPath !== this.currentPath) {
        this.navigateTo(newPath);
      }
    });
    
    // Listen for authentication state changes
    this.controlAccess.addAuthStateChangeListener((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        // Redirect to home when user logs in
        this.wss.connect();
        this.navigateTo('/home');
      } else {
        // Redirect to login when user logs out
        this.navigateTo('/login');
      }
    });
  }

  /*---------------------------NAVIGATION HANDLER---------------------------*/

  // Register routes
  public addRoute(path: string, page: Page): void {
    this.routes.set(path, page);
  }
  
  // Navigate to a specific route
  async navigateTo(path: string): Promise<void> {
    if (path === '/')
      path = '/home'; // Redirect root to home

    if (path === this.currentPath) {
      console.log(`Already on route: ${path}, updating but not re-rendering`);
      // If we're already on this route, just call update on the component
      const currentPage = this.routes.get(path);
      if (currentPage && typeof currentPage.update === 'function') {
        await Promise.resolve(currentPage.update());
      }
      return;
    }
    
    console.log(`Attempting to navigate to: ${path}, isAuthenticated: ${this.controlAccess.isLoggedIn()}`);
    
    if (this.protectedRoutes.includes(path)) {
      const isAuthenticated = await this.controlAccess.checkAuthStatus();
      if (!isAuthenticated) {
        await this.redirectToLogin('');
        return;
      }
    }

    // Update browser history
    window.history.pushState({ path }, '', path);
    this.currentPath = path;
    await this.showPage(path);
  }

  // Redirect to login
  private async redirectToLogin(message?: string): Promise<void> {
    console.log('Redirecting to login page.', message);
    window.history.pushState({ path: '/login' }, '', '/login');
    await this.showPage('/login');
  }

  // Show the page for the given path
  private async showPage(path: string): Promise<void> {
    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  
    // Get the page component for the current route
    const page = this.routes.get(path) || this.routes.get('/404');
    
    if (!page) {
      console.error(`No page component found for route: ${path}`);
      return;
    }
    
    try {
      // Get the rendered element from the component
      const element = await Promise.resolve(page.render());
      
      // Call update method if it exists
      if (typeof page.update === 'function') {
        await Promise.resolve(page.update());
      }
      
      // Append to container - now element will be HTMLElement, not a Promise
      this.container.appendChild(element);
    } catch (error) {
      console.error(`Error rendering page for route ${path}:`, error);
    }
  }

  /*-------------------------------INIT ROUTER------------------------------*/

  // Initialize the router
  public async init(defaultPath: string = '/'): Promise<void> {
    // Listen for clicks on navigation links
    document.addEventListener('click', (e) => { 
      const target = e.target as HTMLElement; 
      const link = target.closest('.nav-link') as HTMLAnchorElement;
      
      if (link) { 
        e.preventDefault(); 
        this.navigateTo(link.getAttribute('href') || '/'); 
      } 
    });

    // Handle initial route
    const initialPath = window.location.pathname;

    if (this.routes.has(initialPath)) {
      await this.navigateTo(initialPath);
    } else {
      window.history.replaceState({ path: defaultPath }, '', defaultPath);
      await this.navigateTo(defaultPath);
    }
  }

  /*--------------------------------ACCESSORS-------------------------------*/
  
  // Getter for current path (for components)
  public getCurrentPath(): string {
    return this.currentPath;
  }
  
  // Getter for ControlAccess (for components that need it)
  public getControlAccess(): ControlAccess {
    return this.controlAccess;
  }

  // Getter for WebSocket Manager
  public getWebSocketManager(): WebSocketManager {
    return this.wss;
  }
}