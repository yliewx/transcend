export function createNavbar(): HTMLElement {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    
    // Home link
    const homeLink = document.createElement('a');
    homeLink.href = '/';
    homeLink.textContent = 'Home';
    
    // Login link
    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.textContent = 'Login';
    
    // Chat link
    const chatLink = document.createElement('a');
    chatLink.href = '/chat';
    chatLink.textContent = 'Live Chat';
    
    // Pong Game link
    const pongLink = document.createElement('a');
    pongLink.href = '/play';
    pongLink.textContent = 'Play Pong';
    
    // Append all links
    navbar.appendChild(homeLink);
    navbar.appendChild(loginLink);
    navbar.appendChild(chatLink);
    navbar.appendChild(pongLink);
    
    return navbar;
  }