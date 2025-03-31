import { Page } from '../types';
import { Router } from '../router';
import { HeaderPage } from './header';

export class PageWithHeader implements Page {
  private contentPage: Page;
  private router: Router;
  private element: HTMLElement | null = null;
  private headerComponent: HeaderPage | null = null;

  constructor(contentPage: Page, router: Router) {
    this.contentPage = contentPage;
    this.router = router;
    this.headerComponent = null;
  }

  async render(): Promise<HTMLElement> {
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'flex flex-col min-h-screen';
    
    // Create and add header
    this.headerComponent = new HeaderPage(this.router);
    container.appendChild(this.headerComponent.render());
    
    // Create main content container
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.className = 'flex-grow';
    
    // Render the content page into the main container
    const contentElement = await this.contentPage.render();
    mainContent.appendChild(contentElement);

    // Add main content to container
    container.appendChild(mainContent);
    
    // Cache the element for future use
    this.element = container;
    
    return container;
  }

  update(): void {
    // Update the header component if it exists
    if (this.headerComponent) {
      this.headerComponent.update();
    }
    
    // Update the content page if it has an update method
    if (this.contentPage && typeof this.contentPage.update === 'function') {
      this.contentPage.update();
    }
  }

  destroy(): void {
    // Call destroy on the content page if it exists
    if (this.contentPage && typeof this.contentPage.destroy === 'function') {
      this.contentPage.destroy();
    }
    
    // Clear the cached element
    this.element = null;
  }
}