export function createLoginPage(): HTMLElement 
{
    const container = document.createElement('div');
    container.className = 'page login-page';
    
    const header = document.createElement('h1');
    header.textContent = 'Login';
    
    const form = document.createElement('form');
    form.className = 'login-form';
    
    // Username field
    const usernameGroup = document.createElement('div');
    usernameGroup.className = 'form-group';
    
    const usernameLabel = document.createElement('label');
    usernameLabel.htmlFor = 'username';
    usernameLabel.textContent = 'Username:';
    
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'username';
    usernameInput.placeholder = 'Enter your username';
    usernameInput.required = true;
    
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);
    
    // Password field
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'form-group';
    
    const passwordLabel = document.createElement('label');
    passwordLabel.htmlFor = 'password';
    passwordLabel.textContent = 'Password:';
    
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'password';
    passwordInput.placeholder = 'Enter your password';
    passwordInput.required = true;
    
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(passwordInput);
    
    // Login button
    const loginButton = document.createElement('button');
    loginButton.type = 'submit';
    loginButton.className = 'login-button';
    loginButton.textContent = 'Login';
    
    // Add event listener for form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;
        
        // Here you would typically handle the authentication
        console.log(`Login attempt: ${username}`);
        alert(`Login attempt with username: ${username}. This would connect to your authentication system.`);
    });
    
    // Assemble the form
    form.appendChild(usernameGroup);
    form.appendChild(passwordGroup);
    form.appendChild(loginButton);
    
    // Add a registration link
    const registerLink = document.createElement('p');
    registerLink.className = 'register-link';
    registerLink.innerHTML = 'Don\'t have an account? <a href="/register">Register here</a>';
    
    // Assemble the page
    container.appendChild(header);
    container.appendChild(form);
    container.appendChild(registerLink);
    
    return container;
}