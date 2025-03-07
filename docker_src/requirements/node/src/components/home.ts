export function createHomePage(): HTMLElement 
{
    const container = document.createElement('div');
    container.className = 'page home-page';
    
    const header = document.createElement('h1');
    header.textContent = 'Home Page';
    
    const content = document.createElement('p');
    content.textContent = 'Lets Play some Pong!';
    
    const button = document.createElement('button');
    button.textContent = 'Click me';
    button.addEventListener('click', () => {
      alert('Button clicked!');
    });
    
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(button);
    
    return container;
}
