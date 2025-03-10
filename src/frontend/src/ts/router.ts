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

  constructor(options: RouterOptions) {
    this.appContainer = options.appContainer;
    this.routes = options.routes;
    this.notFoundRoute = options.notFoundRoute;
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

  public addHandler(viewName: string, handler: RouteHandler): void {
    this.handlers[viewName] = handler;
  }

  public navigate(path: string): void {
    // Update browser history
    window.history.pushState(null, '', path);
    
    // Handle the new route
    this.handleLocationChange();
  }

  private handleLocationChange(): void {
    const path = window.location.pathname;
    const viewName = this.getViewName(path);
    
    if (viewName !== this.currentRoute) {
      this.currentRoute = viewName;
      this.renderView(viewName);
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
    
    this.appContainer.appendChild(header);
  }
}
