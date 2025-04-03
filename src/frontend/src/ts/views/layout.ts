import { Page } from '../types';
import { Router } from '../router';
import { HeaderPage } from './header';

export class PageWithHeader implements Page {
  private element: HTMLElement | null = null;
  private headerComponent: HeaderPage | null = null;

  constructor(private contentPage: Page, private router: Router) {}

  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;
    
    const container = document.createElement('div');
    container.className = 'flex flex-col min-h-screen';
    
    this.headerComponent = new HeaderPage(this.router);
    
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.className = 'flex-grow';
    
    container.appendChild(this.headerComponent.render());
    mainContent.appendChild(await this.contentPage.render());
    container.appendChild(mainContent);
    
    return this.element = container;
  }

  update(): void {
    this.headerComponent?.update();
    typeof this.contentPage.update === 'function' && this.contentPage.update();
  }

  destroy(): void {
    typeof this.contentPage.destroy === 'function' && this.contentPage.destroy();
    this.element = null;
  }
}