import { Router } from '../router';
import { ControlAccess } from '../services/control.access';
import { IconNavLink } from './navlink';
import { homeIcon, gamepadIcon, chartIcon, userIcon, friendsIcon } from './icons'; 
import { LogoutButton } from './logout.button';

export class SidebarComponent {
  private element: HTMLElement | null = null;
  private controlAccess: ControlAccess;
  private navLinks: IconNavLink[] = [];

  constructor(private router: Router) {
    this.controlAccess = this.router.getControlAccess();

    this.navLinks = [
      new IconNavLink('/home', homeIcon, 'Home'),
      new IconNavLink('/play', gamepadIcon, 'Play'),
      new IconNavLink('/stats', chartIcon, 'Stats'),
      new IconNavLink('/profile', userIcon, 'Profile'),
      new IconNavLink('/friends', friendsIcon, 'Friends'),
    ];
  }

  render(): HTMLElement {
    if (this.element) return this.element;

    const sidebar = document.createElement('aside');
    sidebar.className = 'fixed top-0 left-0 h-screen w-20 md:w-48 bg-white shadow-md flex flex-col z-50';

    // Append "transcend" logo
    const topBar = document.createElement('div');
    topBar.className = 'bg-white h-16 flex justify-center items-center shadow w-full';
    topBar.innerHTML = `
      <a href="/home" class="text-xl font-bold text-indigo-600 hidden md:inline">Transcend</a>
    `;
    sidebar.appendChild(topBar);

    // Append navigation links
    const navContainer = document.createElement('nav');
    navContainer.className = 'flex flex-col items-center w-full space-y-2';
    this.navLinks.forEach(link => {
      navContainer.appendChild(link.render());
    });
    // Wrap nav link elements
    const navWrapper = document.createElement('div');
    navWrapper.className = 'flex-1 flex flex-col items-center py-6 space-y-4';
    navWrapper.appendChild(navContainer);
    sidebar.appendChild(navWrapper);

    // Add event listener to logout button
    const logoutBtn = new LogoutButton(() => this.performLogout());
    // Append wrapped logout button
    const logoutBtnWrapper = document.createElement('div');
    logoutBtnWrapper.className = 'flex justify-center mb-4';
    logoutBtnWrapper.appendChild(logoutBtn.render());
    sidebar.appendChild(logoutBtnWrapper);

    this.element = sidebar;
    return sidebar;
  }

  updateActive(path: string): void {
    this.navLinks.forEach(link => {
      link.setActive(link.getHref() === path);
    });
  }

  private async performLogout(): Promise<void> {
    try {
      const result = await this.controlAccess.logout();
      if (!result.success) {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
