export class IconNavLink {
  private element: HTMLElement | null = null;

  constructor(
    private href: string,
    private icon: string,
    private label: string
  ) {}

  render(): HTMLElement {
    if (this.element) return this.element;

    const link = document.createElement('a');
    link.href = this.href;
    link.className = 'nav-link nav-link-inactive';

    link.innerHTML = `
      <span class="w-6 h-6 mr-3 mb-2">${this.icon}</span>
      <span class="hidden md:inline mb-2">${this.label}</span>
    `;

    this.element = link;
    return link;
  }


  setActive(isActive: boolean): void {
    if (!this.element) return;
    this.element.classList.toggle('nav-link-active', isActive);
    this.element.classList.toggle('nav-link-inactive', !isActive);
  }

  getHref(): string {
    return this.href;
  }
}