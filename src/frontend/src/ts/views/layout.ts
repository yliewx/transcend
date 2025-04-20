import { Page } from '../types';
import { Router } from '../router';
import { SidebarComponent } from '../components/sidebar';

export class PageWithHeader implements Page {
  private element: HTMLElement | null = null;
  private sidebarComponent: SidebarComponent | null = null;

  constructor(private contentPage: Page, private router: Router) {}

  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;

    const container = document.createElement('div');
    container.className = 'flex h-screen';

    this.sidebarComponent = new SidebarComponent(this.router);

    const mainArea = document.createElement('div');
    mainArea.className = 'flex flex-col flex-grow';

    const content = await this.contentPage.render();
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.className = 'flex-grow ml-20 md:ml-48';
    mainContent.appendChild(content);

    mainArea.appendChild(mainContent);

    container.appendChild(this.sidebarComponent.render());
    container.appendChild(mainArea);

    this.element = container;
    return container;
  }

  update(): void {
    const path = this.router.getCurrentPath();
    this.sidebarComponent?.updateActive(path);
    typeof this.contentPage.update === 'function' && this.contentPage.update();
  }

  destroy(): void {
    typeof this.contentPage.destroy === 'function' && this.contentPage.destroy();
    this.element = null;
  }
}

// import { Page } from '../types';
// import { Router } from '../router';
// import { HeaderPage } from './header';

// export class PageWithHeader implements Page {
//   private element: HTMLElement | null = null;
//   private headerComponent: HeaderPage | null = null;

//   constructor(private contentPage: Page, private router: Router) {}

//   async render(): Promise<HTMLElement> {
//     if (this.element) return this.element;
    
//     const container = document.createElement('div');
//     container.className = 'flex flex-col min-h-screen';
    
//     this.headerComponent = new HeaderPage(this.router);
    
//     const mainContent = document.createElement('div');
//     mainContent.id = 'main-content';
//     mainContent.className = 'flex-grow';
    
//     container.appendChild(this.headerComponent.render());
//     mainContent.appendChild(await this.contentPage.render());
//     container.appendChild(mainContent);
    
//     return this.element = container;
//   }

//   update(): void {
//     this.headerComponent?.update();
//     typeof this.contentPage.update === 'function' && this.contentPage.update();
//   }

//   destroy(): void {
//     typeof this.contentPage.destroy === 'function' && this.contentPage.destroy();
//     this.element = null;
//   }
// }