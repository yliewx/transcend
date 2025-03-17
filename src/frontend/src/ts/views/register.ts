// views/register.ts
import { Page } from '../types';
import { Router } from '../router';
import { AuthService } from '../services/auth_service';

export class RegisterPage implements Page {
  private router: Router;
  private authService: AuthService;
  
  constructor(router: Router) {
    this.router = router;
    this.authService = router.getAuthService();
  }
  
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'py-10';
    
    container.innerHTML = `
      <main>
        <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900">Create an account</h1>
              <p class="mt-2 text-sm text-gray-600">
                Or <a href="/login" class="nav-link font-medium text-indigo-600 hover:text-indigo-500">sign in to your account</a>
              </p>
            </div>
            
            <form id="register-form" class="mt-8 space-y-6">
              <div id="register-error" class="rounded-md bg-red-50 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800" id="register-error-message"></h3>
                  </div>
                </div>
              </div>
              
              <div id="register-success" class="rounded-md bg-green-50 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-green-800" id="register-success-message"></h3>
                  </div>
                </div>
              </div>
              
              <div class="rounded-md shadow-sm space-y-4">
                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                  <input id="username" name="username" type="text" required 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                
                <div>
                  <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                  <input id="email" name="email" type="email" required 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                  <input id="password" name="password" type="password" required 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                </div>
                
                <div>
                  <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input id="confirm-password" name="confirmPassword" type="password" required 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                </div>
              </div>
              
              <div>
                <button type="submit" 
                       class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    `;
    
    // Add event listeners after rendering
    setTimeout(() => this.attachEventListeners(), 0);
    
    return container;
  }
  
  private attachEventListeners(): void {
    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }
  
  private async handleRegister(e: Event): Promise<void> {
    e.preventDefault();
    
    const registerForm = e.target as HTMLFormElement;
    const errorMessage = document.getElementById('register-error-message') as HTMLElement;
    const errorContainer = document.getElementById('register-error') as HTMLElement;
    const successMessage = document.getElementById('register-success-message') as HTMLElement;
    const successContainer = document.getElementById('register-success') as HTMLElement;
    
    // Hide messages
    errorContainer.classList.add('hidden');
    successContainer.classList.add('hidden');
    
    // Get form data
    const usernameInput = registerForm.querySelector('#username') as HTMLInputElement;
    const emailInput = registerForm.querySelector('#email') as HTMLInputElement;
    const passwordInput = registerForm.querySelector('#password') as HTMLInputElement;
    const confirmPasswordInput = registerForm.querySelector('#confirm-password') as HTMLInputElement;
    
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      errorMessage.textContent = 'All fields are required';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'Please enter a valid email address';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    // Password validation
    if (password.length < 8) {
      errorMessage.textContent = 'Password must be at least 8 characters long';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    // Confirm password
    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      errorContainer.classList.remove('hidden');
      return;
    }
    
    // Use API service via AuthService
    const apiService = this.authService.getApiService();
    const result = await apiService.register(username, email, password);
    
    if (result.success) {
      // Show success message
      successMessage.textContent = result.message || 'Registration successful!';
      successContainer.classList.remove('hidden');
      
      // Clear form
      registerForm.reset();
      
      // Redirect to login after a delay
      setTimeout(() => {
        this.router.navigateTo('/login');
      }, 2000);
    } else {
      // Show error message
      errorMessage.textContent = result.error || 'Registration failed';
      errorContainer.classList.remove('hidden');
    }
  }
}