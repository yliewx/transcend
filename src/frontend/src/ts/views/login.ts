import { Page } from '../types';
import { Router } from '../router';
import { ControlAccess } from '../services/control.access';

export class LoginPage implements Page {
  private router: Router;
  private controlAccess: ControlAccess;
  private element: HTMLElement | null = null;
  private googleClientId: string | null = null;
  
  constructor(router: Router) {
    this.router = router;
    this.controlAccess = this.router.getControlAccess();
    this.googleClientId = this.controlAccess.getGoogleClientId();
  }
  
  render(): HTMLElement {
    // Return cached element if it exists
    if (this.element) {
      console.log('Returning cached element');
      return this.element;
    }

    if (!this.googleClientId) {
      this.googleClientId = this.controlAccess.getGoogleClientId();
    }

    const container = document.createElement('div');
    container.className = 'py-10';
    
    container.innerHTML = `
      <main>
        <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white dark:bg-gray-900 shadow-md rounded-lg p-8">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Log in to your account</h1>
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Or <a href="/register" class="nav-link font-medium text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300">create a new account</a>
              </p>
            </div>
            
            <form id="login-form" class="mt-8 space-y-6">
              <div id="login-message" class="rounded-md bg-pink-50 dark:bg-pink-800 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h1 class="text-2xl font-bold text-pink-800 dark:text-pink-200 text-center">Welcome to transcendence!</h1>
                  </div>
                </div>
              </div>
              
              <div class="rounded-md shadow-sm space-y-4">
                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                  <input id="username" name="username" type="text" 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                </div>
                
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <input id="password" name="password" type="password" 
                        class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-800 dark:text-white">
                </div>
              </div>
              
              <div id="error-message" class="text-red-600 text-sm hidden dark:text-red-400"></div>
              
              <div>
                <button type="button" id="login-button"
                      class="w-full card-button">
                  Log in
                </button>
              </div>
              
              <div class="mt-6">
                <div class="relative">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-300 dark:border-gray-700"></div>
                  </div>
                  <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
                  </div>
                </div>
                
                <div id="g_id_div" class="mt-6 flex justify-center"></div>
              </div>
            </form>
          </div>
        </div>
      </main>
    `;  
    
    // Add event listeners after rendering
    setTimeout(() => this.setupEventHandlers(container), 0);
    setTimeout(() => this.loadGoogleScript(), 0);
    
    // Cache the element for future use
    this.element = container;
    
    return container;
  }

  update(): void {
    // Reset form and error messages if the page is revisited
    if (this.element) {
      const loginForm = this.element.querySelector('#login-form') as HTMLFormElement;
      const errorMessage = this.element.querySelector('#error-message');
      const loginMessage = this.element.querySelector('#login-message');
      
      if (loginForm) loginForm.reset();
      if (errorMessage) errorMessage.classList.add('hidden');
      if (loginMessage) loginMessage.classList.add('hidden');
    }
  }
  
  private loadGoogleScript(): void {
    if (!this.googleClientId) return;
  
    // Only load script if not already loaded
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
  
      script.onload = () => {
        const signInDiv = document.querySelector('#g_id_div');
  
        // Init google identity services
        window.google.accounts.id.initialize({
          client_id: this.googleClientId,
          context: "signin",
          callback: this.handleGoogleCredentialResponse.bind(this)
        });
  
        // Render google sign-in button in the specified div
        window.google.accounts.id.renderButton(signInDiv, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "sign_in_with",
          logo_alignment: "center",
          width: 300
        });
  
        // Auto sign-in
        window.google.accounts.id.prompt();
      };
    }
  }  

  private setupEventHandlers(container: HTMLElement): void {
    const loginButton = container.querySelector('#login-button');
    const loginForm = container.querySelector('#login-form');
    
    if (loginButton) {
      loginButton.addEventListener('click', () => this.handleLogin());
    }
    
    if (loginForm) {
      loginForm.addEventListener('keypress', ((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleLogin();
        }
      }) as EventListener);
    }
    
    // Define the global callback for Google Sign-In
    window.handleGoogleCredentialResponse = this.handleGoogleCredentialResponse.bind(this);
  }

  private async handleLogin(): Promise<void> {
    if (!this.element) return;
    
    const usernameInput = this.element.querySelector('#username') as HTMLInputElement;
    const passwordInput = this.element.querySelector('#password') as HTMLInputElement;
    const errorMessage = this.element.querySelector('#error-message');
    const loginMessage = this.element.querySelector('#login-message');
    
    if (!usernameInput || !passwordInput) return;
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Basic validation
    if (!username || !password) {
      if (errorMessage) {
        errorMessage.textContent = 'Please enter both username and password';
        errorMessage.classList.remove('hidden');
      }
      return;
    }
    
    try {
      // Use ControlAccess for login
      const result = await this.controlAccess.login(username, password);
      
      if (result.success) {
        // Show success message
        if (loginMessage) {
          loginMessage.classList.remove('hidden');
        }
        
        if (result.user.id) {
          sessionStorage.setItem('userId', result.user.id);
        }
        
        // Check if user's preferred 2FA option is set
        if (result.user.otp_option !== null) {
          // No need to generate OTP if using authenticator app
          if (result.user.otp_option === 'app') {
            console.log('App OTP is enabled. Navigating to verification page');
            this.router.navigateTo('/otp/verify');
            return;
          }

          // Send request to generate OTP before navigating to /otp/verify
          console.log(`Requesting OTP via ${result.user.otp_option}`);
          const res = await this.controlAccess.getAuthService().generateOtp();
          if (res.success) {
            this.router.navigateTo('/otp/verify');
          }
          else {
            console.error('Failed to generate OTP:', res.message);
            alert(`Failed to generate OTP: ${res.message || 'Unknown error'}`);
          }
        }
        else { // First time login: 2FA setup required
          if (result.user.email) {
            sessionStorage.setItem('userEmail', result.user.email);
          }
          this.router.navigateTo('/otp/setup');
        }

        // Hide error message if it was shown
        if (errorMessage) {
          errorMessage.classList.add('hidden');
        }
      } else { // If login is unsuccessful
        // Show error message
        if (errorMessage) {
          errorMessage.textContent = result.error || 'Login failed. Please try again.';
          errorMessage.classList.remove('hidden');
        }
      }
    } catch (error) {
      if (errorMessage) {
        errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        errorMessage.classList.remove('hidden');
      }
      console.error('Login error:', error);
    }
  }

  private async handleGoogleCredentialResponse(response: any): Promise<void> {
    try {
      // Get the ID token from the response
      const idToken = response.credential;
      
      // Verify ID token in the backend
      const result = await this.controlAccess.loginWithGoogle(idToken);
      
      if (result.success) {
        // Show success message
        const loginMessage = this.element?.querySelector('#login-message');
        if (loginMessage) {
          loginMessage.classList.remove('hidden');
        }
        
        if (result.user.id) {
          sessionStorage.setItem('userId', result.user.id);
        }

        console.log('Signed in with Google; no need for 2FA');
        
        // Hide error message if it was shown
        const errorMessage = this.element?.querySelector('#error-message');
        if (errorMessage) {
          errorMessage.classList.add('hidden');
        }
      } else {
        // Show error message
        const errorMessage = this.element?.querySelector('#error-message');
        if (errorMessage) {
          errorMessage.textContent = result.error || 'Google login failed. Please try again.';
          errorMessage.classList.remove('hidden');
        }
      }
    } catch (error) {
      const errorMessage = this.element?.querySelector('#error-message');
      if (errorMessage) {
        errorMessage.textContent = 'An unexpected error occurred with Google Sign-In. Please try again.';
        errorMessage.classList.remove('hidden');
      }
      console.error('Google login error:', error);
    }
  }
}

declare global {
  interface Window {
    google: any;
    handleGoogleCredentialResponse: (response: any) => void;
  }
}