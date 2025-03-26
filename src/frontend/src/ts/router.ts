import { Page } from './types';
import { ControlAccess } from './services/control.access';
import { UserService } from './services/user.service';

export class Router {
  private routes: Map<string, Page>;
  private container: HTMLElement;
  private currentPath: string = '';

  constructor(container: HTMLElement, private controlAccess: ControlAccess) {
    this.routes = new Map();
    this.container = container;

    // Handle popstate events (browser back/forward buttons)
    window.addEventListener('popstate', (event) => {
      const newPath = window.location.pathname;
      if (newPath !== this.currentPath) {
        this.handleRoute(newPath);
      }
    });
    
    // // Listen for authentication state changes
    // this.controlAccess.addAuthStateChangeListener((isAuthenticated: boolean) => {
    //   if (isAuthenticated) {
    //     // Redirect to home when user logs in
    //     this.navigateTo('/home');
    //   } else {
    //     // Redirect to login when user logs out
    //     this.navigateTo('/login');
    //   }
    // });
  }

  // Register routes
  addRoute(path: string, page: Page): void {
    this.routes.set(path, page);
  }

  // Navigate to a specific route
  async navigateTo(path: string): Promise<void> {
    if (path === this.currentPath) return; // Prevent re-navigation

    console.log(`Attempting to navigate to: ${path}, isAuthenticated: ${this.controlAccess.isLoggedIn()}`);
    
    // Redirect to login if trying to access protected routes while not authenticated
    if (!this.controlAccess.isLoggedIn() && this.isProtectedRoute(path) && path !== '/login') {
      // Refresh access token if valid refresh token exists
      const result = await this.controlAccess.handleTokenRefresh();
      // Redirect to login if token refresh failed
      if (!result.success) {
        console.log('Redirecting to login - protected route accessed while not authenticated');
        window.history.pushState({ path: '/login' }, '', '/login');
        this.handleRoute('/login');
      }
      return;
    }
    
    // // Redirect to home if trying to access auth routes while authenticated
    // if (this.controlAccess.isLoggedIn() && this.isAuthRoute(path)) {
    //   console.log('Redirecting to home - auth route accessed while authenticated');
    //   window.history.pushState({ path: '/home' }, '', '/home');
    //   this.handleRoute('/home');
    //   return;
    // }

    // Update browser history
    window.history.pushState({ path }, '', path);
    this.handleRoute(path);
  }

  async handleRoute(path: string): Promise<void> {
    if (path === this.currentPath) {
      console.log(`Already on route: ${path}, not rendering again`);
      return;
    }
  
    this.currentPath = path;
    
    // If path is root, redirect based on auth status
    if (path === '/') {
      if (this.controlAccess.isLoggedIn()) {
        this.navigateTo('/home');
      } else {
        this.navigateTo('/login');
      }
      return;
    }
  
    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  
    // Get the page for the current route
    const page = this.routes.get(path) || this.routes.get('/404');
    
    if (page) {
      // Handle both synchronous and asynchronous rendering
      const element = await Promise.resolve(page.render());
      this.container.appendChild(element);
    }
  }

  // Initialize the router
  init(defaultPath: string = '/'): void {
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
      this.handleRoute(initialPath);
    } else {
      window.history.replaceState({ path: defaultPath }, '', defaultPath);
      this.handleRoute(defaultPath);
    }
  }

  private isProtectedRoute(path: string): boolean {
    // Routes that require authentication
    const protectedRoutes = ['/home', '/play', '/stats', '/profile'];
    return protectedRoutes.includes(path);
  }
  
  private isAuthRoute(path: string): boolean {
    // Routes that are only for unauthenticated users
    const authRoutes = ['/login', '/register'];
    return authRoutes.includes(path);
  }
  
  // Getter for current path (for components)
  public getCurrentPath(): string {
    return this.currentPath;
  }
  
  // Getter for ControlAccess (for components that need it)
  public getControlAccess(): ControlAccess {
    return this.controlAccess;
  }
}