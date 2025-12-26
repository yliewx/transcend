import { Router } from '../router';
import { ControlAccess } from '../services/control.access';
import { IconNavLink } from './navlink';
import { homeIcon, gamepadIcon, chartIcon, userIcon, friendsIcon, trophyIcon, privacyIcon } from './icons'; 
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
      new IconNavLink('/tournaments', trophyIcon, 'Tour'),
      new IconNavLink('/stats', chartIcon, 'Stats'),
      new IconNavLink('/profile', userIcon, 'Profile'),
      new IconNavLink('/friends', friendsIcon, 'Friends'),
      new IconNavLink('/privacy', privacyIcon, 'Privacy'),
    ];


  }

  render(): HTMLElement {
    if (this.element) return this.element;

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    const topBar = document.createElement('div');
    topBar.className = 'sidebar-header';
    topBar.innerHTML = `
      <a href="/home" class="sidebar-title">Transcend</a>
    `;
    sidebar.appendChild(topBar);

    const navContainer = document.createElement('nav');
    navContainer.className = 'nav-container';
    this.navLinks.forEach(link => {
      navContainer.appendChild(link.render());
    });

    const navWrapper = document.createElement('div');
    navWrapper.className = 'nav-wrapper';
    navWrapper.appendChild(navContainer);
    sidebar.appendChild(navWrapper);

    const logoutBtn = new LogoutButton(() => this.performLogout());
    const logoutBtnWrapper = document.createElement('div');
    logoutBtnWrapper.className = 'logout-wrapper';
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