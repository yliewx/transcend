export class ImageCardComponent {
  private element: HTMLElement | null = null;

  constructor(
    private title: string,
    private imageSrc: string,
    private linkHref: string,
    private animationDelay: string = '0s'
  ) {}

  render(): HTMLElement {
    if (this.element) return this.element;

    const wrapper = document.createElement('a');
    wrapper.href = this.linkHref;
    wrapper.className = `
      group relative overflow-hidden rounded-lg shadow-lg 
      opacity-0 animate-fade-slide-in nav-link
    `;
    wrapper.style.animationDelay = this.animationDelay;

    wrapper.innerHTML = `
      <img 
        src="${this.imageSrc}" 
        alt="${this.title}" 
        class="w-full h-100 object-cover transform group-hover:scale-110 transition duration-300"
      />
      <div class="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
        <span class="text-pink-400 text-xl font-bold">${this.title}</span>
      </div>
    `;

    this.element = wrapper;
    return wrapper;
  }
}
