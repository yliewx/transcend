export class IconNavLink {
  private element: HTMLElement | null = null;

  constructor(
    private href: string,
    private icon: string, // SVG content
    private label: string
  ) {}

  render(): HTMLElement {
    if (this.element) return this.element;

    const link = document.createElement('a');
    link.href = this.href;
    link.className =
      'nav-link flex items-center p-3 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all';

    link.innerHTML = `
      <span class="w-6 h-6 mr-2">${this.icon}</span>
      <span class="hidden md:inline">${this.label}</span>
    `;

    this.element = link;
    return link;
  }

  setActive(isActive: boolean): void {
    if (!this.element) return;
    this.element.classList.toggle('text-indigo-600', isActive);
    this.element.classList.toggle('text-gray-500', !isActive);
  }

  getHref(): string {
    return this.href;
  }
}
