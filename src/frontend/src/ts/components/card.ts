export class CardComponent {
  private element: HTMLElement | null = null;

  constructor(
    private title: string,
    private description: string,
    private linkText: string,
    private linkHref: string
  ) {}

  render(): HTMLElement {
    if (this.element) return this.element;

    const wrapper = document.createElement('div');
    wrapper.className = 'card';

    wrapper.innerHTML = `
      <h2 class="card-title">${this.title}</h2>
      <p class="card-description">${this.description}</p>
      <a href="${this.linkHref}" class="nav-link card-button">${this.linkText}</a>
    `;

    this.element = wrapper;
    return wrapper;
  }
}
