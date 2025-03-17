// views/layout.ts
import { Page } from '../types';
import { Router } from '../router';
import { HeaderPage } from './header';

// A wrapper that adds header to any page content
export class PageWithHeader implements Page {
  private contentPage: Page;
  private router: Router;

  constructor(contentPage: Page, router: Router) {
    this.contentPage = contentPage;
    this.router = router;
  }

  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'flex flex-col min-h-screen';
    
    // Create and add header
    const header = new HeaderPage(this.router);
    container.appendChild(header.render());
    
    // Create main content container
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.className = 'flex-grow';
    
    // Render the content page into the main container
    // Handle both synchronous and asynchronous content rendering
    const contentElement = await Promise.resolve(this.contentPage.render());
    mainContent.appendChild(contentElement);
    
    // Add main content to container
    container.appendChild(mainContent);
    
    return container;
  }
}