import { ApiService } from './services/api';

type RouteHandler = (container: HTMLElement) => void;

interface RouterOptions {
  appContainer: HTMLElement;
  routes: Record<string, string>;
  notFoundRoute: string;
}

export class Router {
  private appContainer: HTMLElement;
  private routes: Record<string, string>;
  private handlers: Record<string, RouteHandler> = {};
  private notFoundRoute: string;
  private currentRoute: string = '';
  private isAuthenticated: boolean = false;
  private apiService: ApiService;

  constructor(options: RouterOptions, apiService: ApiService) {
    this.appContainer = options.appContainer;
    this.routes = options.routes;
    this.notFoundRoute = options.notFoundRoute;
    this.apiService = apiService;
    // Check if user is authenticated (has a token in cookie)
    this.checkAuthentication();
  }

  public init(): void {
    // Handle initial load
    this.handleLocationChange();

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleLocationChange();
    });

    // Intercept link clicks for client-side navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.nav-link') as HTMLAnchorElement;
      
      if (link && link.href) {
        e.preventDefault();
        
        const url = new URL(link.href);
        const pathname = url.pathname;
        
        this.navigate(pathname);
      }
    });
  }
  
  private checkAuthentication(): void {
    // Check if token exists in cookies
    this.isAuthenticated = document.cookie.includes('token=');
  }

  public addHandler(viewName: string, handler: RouteHandler): void {
    this.handlers[viewName] = handler;
  }

  public navigate(path: string): void {
    console.log(`Attempting to navigate to: ${path}, isAuthenticated: ${this.isAuthenticated}`);
    
    // Redirect to login if trying to access protected routes while not authenticated
    if (!this.isAuthenticated && this.isProtectedRoute(path)) {
      window.history.pushState(null, '', '/login');
      this.handleLocationChange();
      return;
    }
    
    // Redirect to home if trying to access auth routes while authenticated
    if (this.isAuthenticated && this.isAuthRoute(path)) {
      window.history.pushState(null, '', '/home');
      this.handleLocationChange();
      return;
    }
    
    // Update browser history
    window.history.pushState(null, '', path);
    
    // Handle the new route
    this.handleLocationChange();
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

  private handleLocationChange(): void {
    const path = window.location.pathname;
    
    // If path is root and user is authenticated, redirect to home
    if (path === '/' && this.isAuthenticated) {
      console.log("Root path with auth, redirecting to home");
      this.navigate('/home');
      return;
    }
    
    // If path is root and user is not authenticated, redirect to login
    if (path === '/' && !this.isAuthenticated) {
      this.navigate('/login');
      return;
    }
    
    const viewName = this.getViewName(path);
    console.log(`View name for path ${path} is: ${viewName}`);

    if (viewName !== this.currentRoute) {
      this.currentRoute = viewName;
      console.log(`Rendering view: ${viewName}`);
      this.renderView(viewName);
    }
    else {
      console.log(`Already on route: ${viewName}, not rendering again`);
    }
  }

  private getViewName(path: string): string {
    // Find matching route
    for (const [route, viewName] of Object.entries(this.routes)) {
      if (path === route) {
        return viewName;
      }
    }
    
    // Return not found route if no match
    return this.notFoundRoute;
  }

  private renderView(viewName: string): void {
    // Clear container
    this.appContainer.innerHTML = '';
    
    // Add header
    this.renderHeader();
    
    // Create main content container
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    this.appContainer.appendChild(mainContent);
    
    // Get handler for view
    const handler = this.handlers[viewName];
    
    if (handler) {
      // Call handler to render view
      handler(mainContent);
    } else {
      // Fallback to not found
      const notFoundHandler = this.handlers[this.notFoundRoute];
      if (notFoundHandler) {
        notFoundHandler(mainContent);
      } else {
        mainContent.innerHTML += '<div class="p-4">Page not found</div>';
      }
    }
  }

  private renderHeader(): void {
    const header = document.createElement('header');
    header.className = 'bg-white shadow';
    
    if (this.isAuthenticated) {
      // Authenticated header with navigation links
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
      
    } else {
      // Unauthenticated header with login/register links
      header.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <div class="flex-shrink-0 flex items-center">
                <a href="/" class="nav-link text-xl font-bold text-indigo-600">Transcend</a>
              </div>
            </div>
            <div class="ml-6 flex items-center" id="auth-actions">
              ${this.currentRoute === 'login' ? 
                `<a href="/register" class="nav-link ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  Register
                </a>` : 
                `<a href="/login" class="nav-link ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  Log in
                </a>`
              }
            </div>
          </div>
        </div>
      `;
    }
    
    this.appContainer.appendChild(header);
  }
  
  // private async handleLogout(): Promise<void> {
  //   try {
  //     // Make a request to your logout endpoint
  //     const response = await fetch('/logout', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       credentials: 'include' // Include cookies
  //     });
      
  //     if (response.ok) {
  //       // Update authentication status
  //       this.isAuthenticated = false;
        
  //       // Navigate to login page
  //       this.navigate('/login');
  //     } else {
  //       console.error('Logout failed');
  //     }
  //   } catch (error) {
  //     console.error('Logout error:', error);
  //   }
  // }

  private async performLogout(): Promise<void> {
    const result = await this.apiService.logout();
    
    if (result.success) {
      // Update authentication status
      this.isAuthenticated = false;
      
      // Navigate to login page
      this.navigate('/login');
    } else {
      console.error('Logout failed:', result.error);
    }
  }
  
  // Helper method to set authentication status (can be called after login)
  public setAuthenticated(status: boolean): void {
    this.isAuthenticated = status;
  }
}
