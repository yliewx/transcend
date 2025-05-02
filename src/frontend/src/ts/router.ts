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
    this.wss = new WebSocketManager(process.env.BASE_WSS_URL as string);
    this.wss.connect();

    window.addEventListener('popstate', (event) => {
      this.isHandlingPopState = true;
      const newPath = window.location.pathname;
      if (newPath !== this.currentPath) {
        this.navigateTo(newPath, false);
      }
      this.isHandlingPopState = false;
    });
    
    this.controlAccess.addAuthStateChangeListener((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        this.wss.connect();
        this.navigateTo('/home');
      } else {
        this.navigateTo('/login');
      }
    });
  }

  /*---------------------------NAVIGATION HANDLER---------------------------*/

  public addRoute(path: string, page: Page): void {
    this.routes.set(path, page);
  }

  private getRoutePath(path: string): { routePath: string, paramId: string | null } {
    const tournamentMatch = path.match(/^\/tournaments\/(\d+)$/);
    if (tournamentMatch) {
      return { 
        routePath: '/tournaments/:id',
        paramId: tournamentMatch[1]
      };
    }
  
    return {
      routePath: path,
      paramId: null
    };
  }

  private destroyCurrentPage(): void {
    if (!this.currentPath) return;
    
    const { routePath: currentRoutePath } = this.getRoutePath(this.currentPath);
    const currentPage = this.routes.get(currentRoutePath);
    
    if (currentPage && typeof currentPage.destroy === 'function') {
      currentPage.destroy();
    }
}

  async navigateTo(path: string, pushState: boolean = true): Promise<void> {
    if (path === '/')
      path = '/home';

    const { routePath, paramId: tournamentId } = this.getRoutePath(path);

    if (this.currentPath && this.currentPath !== path) {
      this.destroyCurrentPage();
    }

    if (path === this.currentPath) {
      const currentPage = this.routes.get(routePath);
      if (currentPage && typeof currentPage.update === 'function') {
        await Promise.resolve(currentPage.update());
      }
      return;
    }
        
    if (this.protectedRoutes.includes(routePath)) {
      const isAuthenticated = await this.controlAccess.checkAuthStatus();
      if (!isAuthenticated) {
        await this.redirectToLogin('');
        return;
      }
    }

    if (pushState && !this.isHandlingPopState) {
      window.history.pushState({ path }, '', path);
    }
    
    this.currentPath = path;
    await this.showPage(routePath, tournamentId);
  }

  private async redirectToLogin(message?: string): Promise<void> {
    console.log('Redirecting to login page.', message);
    if (this.currentPath && this.currentPath !== '/login') {
      this.destroyCurrentPage();
    }
    if (!this.isHandlingPopState) {
      window.history.pushState({ path: '/login' }, '', '/login');
    }
    this.currentPath = '/login';
    await this.showPage('/login');
  }
  
  
  private async showPage(routePath: string, tournamentId: string | null = null): Promise<void> {
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  
    const page = this.routes.get(routePath) || this.routes.get('/404');
    
    if (!page) {
      console.error(`No page component found for route: ${routePath}`);
      return;
    }
    
    try {
      if (routePath === '/tournaments/:id' && tournamentId) {
        if (typeof page.setTournamentId === 'function') {
          page.setTournamentId(tournamentId);
        } else {
          console.error('Tournament page component is missing setTournamentId method');
        }
      }

      const element = await Promise.resolve(page.render());

      if (typeof page.update === 'function') {
        await Promise.resolve(page.update());
      }      

      this.container.appendChild(element);
    } catch (error) {
      console.error(`Error rendering page for route ${routePath}:`, error);
    }
  }
  
  /*-------------------------------INIT ROUTER------------------------------*/

  public async init(defaultPath: string = '/'): Promise<void> {
    document.addEventListener('click', (e) => { 
      const target = e.target as HTMLElement; 
      const link = target.closest('.nav-link') as HTMLAnchorElement;
      
      if (link) { 
        e.preventDefault(); 
        this.navigateTo(link.getAttribute('href') || '/'); 
      } 
    });

    const initialPath = window.location.pathname;
    
    const tournamentMatch = initialPath.match(/^\/tournaments\/(\d+)$/);
    if (tournamentMatch && this.routes.has('/tournaments/:id')) {
      await this.navigateTo(initialPath, false); 
    } else if (this.routes.has(initialPath)) {
      await this.navigateTo(initialPath, false); 
    } else {
      window.history.replaceState({ path: defaultPath }, '', defaultPath);
      await this.navigateTo(defaultPath, false); 
    }
  }

  /*--------------------------------ACCESSORS-------------------------------*/
  
  public getCurrentPath(): string {
    return this.currentPath;
  }
  
  public getControlAccess(): ControlAccess {
    return this.controlAccess;
  }

  public getWsManager(): WebSocketManager {
    return this.wss;
  }
}