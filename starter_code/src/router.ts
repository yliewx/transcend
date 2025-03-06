import { Route } from './types';

export class Router 
{
  private routes: Route[];
  private rootElement: HTMLElement;
  private currentComponent: HTMLElement | null = null;

  constructor(routes: Route[], rootElement: HTMLElement) 
  {
    this.routes = routes;
    this.rootElement = rootElement;
    
    // Handle navigation
    window.addEventListener('popstate', () => this.render());
    
    // Intercept link clicks for SPA navigation
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        this.navigate(target.getAttribute('href') || '/');
      }
    });
  }

  public init(): void 
  {
    // Check if we're on a path that should show the 404 page
    const path = window.location.pathname;
    const validPaths = this.routes
      .filter(route => route.path !== '*')
      .map(route => route.path);
      
    if (!validPaths.includes(path) && path !== '/') {
      // Invalid path, show 404 page but keep the URL
      const route = this.routes.find(route => route.path === '*')!;
      document.title = route.title;
      
      if (this.currentComponent) {
        this.rootElement.removeChild(this.currentComponent);
      }
      
      this.currentComponent = route.component();
      this.rootElement.appendChild(this.currentComponent);
      return;
    }
    
    this.render();
  }

  public navigate(path: string): void 
  {
    window.history.pushState({}, '', path);
    this.render();
  }

  private render(): void {
    const path = window.location.pathname;
    const route = this.routes.find(route => route.path === path) 
      || this.routes.find(route => route.path === '*') 
      || this.routes[0];
    
    // Update document title
    document.title = route.title;
    
    // Clear and render new component
    if (this.currentComponent) {
      this.rootElement.removeChild(this.currentComponent);
    }
    
    this.currentComponent = route.component();
    this.rootElement.appendChild(this.currentComponent);
  }
}