// src/components/about.ts
export function createAboutPage() {
    const container = document.createElement('div');
    container.className = 'page about-page';
    const header = document.createElement('h1');
    header.textContent = 'About Page';
    const content = document.createElement('p');
    content.textContent = 'This is a simple SPA built with TypeScript without any frameworks.';
    container.appendChild(header);
    container.appendChild(content);
    return container;
}
//# sourceMappingURL=about.js.map