import { Page } from './types';
import { ControlAccess } from './services/control.access';
import { WebSocketManager } from './services/websocket.manager';

export class Router {
  private routes: Map<string, Page>;
  private container: HTMLElement;
  private currentPath: string = '';
  private protectedRoutes: string[] = ['/home', '/play', '/stats', '/profile', '/friends', '/tournaments/:id'];
  private wss: WebSocketManager;
  private isHandlingPopState: boolean = false;

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(container: HTMLElement, private controlAccess: ControlAccess) {
    this.routes = new Map();
    this.container = container;
    
    // Create websocket connection to server
    this.wss = new WebSocketManager(process.env.BASE_WSS_URL as string);
    this.wss.connect();

    // Handle popstate events (browser back/forward buttons)
    window.addEventListener('popstate', (event) => {
      this.isHandlingPopState = true;
      const newPath = window.location.pathname;
      if (newPath !== this.currentPath) {
        this.navigateTo(newPath, false); // Don't push state when handling popstate
      }
      this.isHandlingPopState = false;
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
  async navigateTo(path: string, pushState: boolean = true): Promise<void> {
    if (path === '/')
      path = '/home'; // Redirect root to home

    // Check if path matches tournament pattern
    let routePath = path;
    let tournamentId: string | null = null;
    
    // Single pattern check for tournament route
    const tournamentMatch = path.match(/^\/tournaments\/(\d+)$/);
    if (tournamentMatch) {
      routePath = '/tournaments/:id';
      tournamentId = tournamentMatch[1];
    }

    if (path === this.currentPath) {
      console.log(`Already on route: ${path}, updating but not re-rendering`);
      // If we're already on this route, just call update on the component
      const currentPage = this.routes.get(routePath);
      if (currentPage && typeof currentPage.update === 'function') {
        await Promise.resolve(currentPage.update());
      }
      return;
    }
    
    console.log(`Attempting to navigate to: ${path}, isAuthenticated: ${this.controlAccess.isLoggedIn()}`);
    
    if (this.protectedRoutes.includes(routePath)) {
      const isAuthenticated = await this.controlAccess.checkAuthStatus();
      if (!isAuthenticated) {
        await this.redirectToLogin('');
        return;
      }
    }

    // Only update browser history if not handling a popstate event
    if (pushState && !this.isHandlingPopState) {
      window.history.pushState({ path }, '', path);
    }
    
    this.currentPath = path;
    await this.showPage(routePath, tournamentId);
  }

  // Redirect to login
  private async redirectToLogin(message?: string): Promise<void> {
    console.log('Redirecting to login page.', message);
    // Only push state if not handling a popstate event
    if (!this.isHandlingPopState) {
      window.history.pushState({ path: '/login' }, '', '/login');
    }
    this.currentPath = '/login';
    await this.showPage('/login');
  }
  
  
  // Show the page for the given path with optional parameter
  private async showPage(routePath: string, tournamentId: string | null = null): Promise<void> {
    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  
    // Get the page component for the current route
    const page = this.routes.get(routePath) || this.routes.get('/404');
    
    if (!page) {
      console.error(`No page component found for route: ${routePath}`);
      return;
    }
    
    try {
      // If we have a tournament ID, set it directly
      if (routePath === '/tournaments/:id' && tournamentId) {
        if (typeof page.setTournamentId === 'function') {
          page.setTournamentId(tournamentId);
        } else {
          console.error('Tournament page component is missing setTournamentId method');
        }
      }
      // Get the rendered element from the component
      const element = await Promise.resolve(page.render());

      if (routePath === '/tournaments/:id' && typeof page.destroy === 'function') {
        page.destroy(); // This will set element to null in the page component
      }
      // Call update method if it exists
      if (typeof page.update === 'function') {
        await Promise.resolve(page.update());
      }
      
      // Append to container
      this.container.appendChild(element);
    } catch (error) {
      console.error(`Error rendering page for route ${routePath}:`, error);
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
    
    // Check if initialPath matches tournament pattern
    const tournamentMatch = initialPath.match(/^\/tournaments\/(\d+)$/);
    if (tournamentMatch && this.routes.has('/tournaments/:id')) {
      await this.navigateTo(initialPath, false); // Don't push state for initial route
    } else if (this.routes.has(initialPath)) {
      await this.navigateTo(initialPath, false); // Don't push state for initial route
    } else {
      window.history.replaceState({ path: defaultPath }, '', defaultPath);
      await this.navigateTo(defaultPath, false); // Don't push state for initial route
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
  public getWsManager(): WebSocketManager {
    return this.wss;
  }
}