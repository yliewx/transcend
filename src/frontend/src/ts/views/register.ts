import { Page } from '../types';
import { Router } from '../router';
import { AuthService } from '../services/auth.service';

export class RegisterPage implements Page {
  private router: Router;
  private authService: AuthService;
  private element: HTMLElement | null = null;
  
  constructor(router: Router) {
    this.router = router;
    this.authService = router.getControlAccess().getAuthService();
  }
  
  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'py-10';
    
    container.innerHTML = `
      <main>
        <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white dark:bg-gray-900 shadow-md rounded-lg p-8">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Or <a href="/login" class="nav-link font-medium text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300">sign in to your account</a>
              </p>
            </div>
            
            <form id="register-form" class="mt-8 space-y-6">
              <div id="register-error" class="rounded-md bg-red-50 dark:bg-red-900 dark:bg-opacity-20 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800 dark:text-red-300" id="register-error-message"></h3>
                  </div>
                </div>
              </div>
              
              <div id="register-success" class="rounded-md bg-green-50 dark:bg-green-900 dark:bg-opacity-20 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-green-800 dark:text-green-300" id="register-success-message"></h3>
                  </div>
                </div>
              </div>
              
              <div class="rounded-md shadow-sm space-y-4">
                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                  <input id="username" name="username" type="text" maxlength="20" required 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                </div>
                
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
                  <input id="email" name="email" type="email" maxlength="40" required 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                </div>
                
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <input id="password" name="password" type="password" maxlength="20" required 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters</p>
                </div>
                
                <div>
                  <label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <input id="confirm-password" name="confirmPassword" type="password" maxlength="20" required 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                </div>
              </div>
              
              <div>
                <button type="submit" class="w-full card-button">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    `;  
    
    this.setupEventHandlers(container);
    
    this.element = container;
    
    return container;
  }
  
  update(): void {
    if (this.element) {
      const registerForm = this.element.querySelector('#register-form') as HTMLFormElement;
      const errorContainer = this.element.querySelector('#register-error');
      const successContainer = this.element.querySelector('#register-success');
      
      if (registerForm) registerForm.reset();
      if (errorContainer) errorContainer.classList.add('hidden');
      if (successContainer) successContainer.classList.add('hidden');
    }
  }
  
  private setupEventHandlers(container: HTMLElement): void {
    const registerForm = container.querySelector('#register-form') as HTMLFormElement;
    
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }
  
  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();
    
    if (!this.element) return;
    
    const registerForm = e.target as HTMLFormElement;
    const errorMessage = this.element.querySelector('#register-error-message') as HTMLElement;
    const errorContainer = this.element.querySelector('#register-error') as HTMLElement;
    const successMessage = this.element.querySelector('#register-success-message') as HTMLElement;
    const successContainer = this.element.querySelector('#register-success') as HTMLElement;    
    errorContainer.classList.add('hidden');
    successContainer.classList.add('hidden');

    const usernameInput = registerForm.querySelector('#username') as HTMLInputElement;
    const emailInput = registerForm.querySelector('#email') as HTMLInputElement;
    const passwordInput = registerForm.querySelector('#password') as HTMLInputElement;
    const confirmPasswordInput = registerForm.querySelector('#confirm-password') as HTMLInputElement;
    
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!username || !email || !password || !confirmPassword) {
      errorMessage.textContent = 'All fields are required';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (username.length < 3 || username.length > 20) {
      errorMessage.textContent = 'Username must be between 3 and 20 characters';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (username.includes(' ')) {
      errorMessage.textContent = 'Username cannot contain spaces';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (email.length < 3 || email.length > 40) {
      errorMessage.textContent = 'Email must be between 3 and 40 characters';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (email.includes(' ')) {
      errorMessage.textContent = 'Email cannot contain spaces';
      errorContainer.classList.remove('hidden');
      return;
    }
        
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'Please enter a valid email address';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    if (password.length < 8 || password.length > 20) {
      errorMessage.textContent = 'Password must be between 3 and 20 characters';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (password.includes(' ')) {
      errorMessage.textContent = 'Password cannot contain spaces';
      errorContainer.classList.remove('hidden');
      return;
    }
    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    const result = await this.authService.register(username, email, password);
    
    if (result.success) {
      successMessage.textContent = result.message || 'Registration successful!';
      successContainer.classList.remove('hidden');
      
      registerForm.reset();
      
      setTimeout(() => {
        this.router.navigateTo('/login');
      }, 2000);
    } else {
      errorMessage.textContent = result.error || 'Registration failed';
      errorContainer.classList.remove('hidden');
    }
  }
}