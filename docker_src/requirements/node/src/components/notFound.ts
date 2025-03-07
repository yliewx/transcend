export function createNotFoundPage(): HTMLElement 
{
  const container = document.createElement('div');
  container.className = 'page not-found-page';
  
  const header = document.createElement('h1');
  header.textContent = '404 - Page Not Found';
  
  const content = document.createElement('p');
  content.textContent = 'The page you are looking for does not exist.';
  
  const link = document.createElement('a');
  link.href = '/';
  link.textContent = 'Go to Home';
  
  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(link);
  
  return container;
}
