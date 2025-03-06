// src/components/navbar.ts
export function createNavbar() {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    const homeLink = document.createElement('a');
    homeLink.href = '/';
    homeLink.textContent = 'Home';
    const aboutLink = document.createElement('a');
    aboutLink.href = '/about';
    aboutLink.textContent = 'About';
    navbar.appendChild(homeLink);
    navbar.appendChild(aboutLink);
    return navbar;
}
//# sourceMappingURL=navbar.js.map