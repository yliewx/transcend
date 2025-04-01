import { Page } from '../types';
import { Router } from '../router';
import { ControlAccess } from '../services/control.access';

export class LoginPage implements Page {
  private router: Router;
  private controlAccess: ControlAccess;
  
  constructor(router: Router) {
    this.router = router;
    this.controlAccess = this.router.getControlAccess();
  }
  
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'py-10';
    
    container.innerHTML = `
      <main>
        <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900">Log in to your account</h1>
              <p class="mt-2 text-sm text-gray-600">
                Or <a href="/register" class="nav-link font-medium text-indigo-600 hover:text-indigo-500">create a new account</a>
              </p>
            </div>
            
            <form id="login-form" class="mt-8 space-y-6">
              <div id="login-message" class="rounded-md bg-blue-50 p-4 hidden">
                <div class="flex">
                  <div class="ml-3">
                    <h1 class="text-2xl font-bold text-blue-800 text-center">Welcome to transcendence!</h1>                    
                  </div>
                </div>
              </div>
              
              <div class="rounded-md shadow-sm space-y-4">
                <div>
                  <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                  <input id="username" name="username" type="text" 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                
                <div>
                  <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                  <input id="password" name="password" type="password" 
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                </div>
              </div>
              
              <div id="error-message" class="text-red-600 text-sm hidden"></div>
              
              <div>
                <button type="button" id="login-button"
                      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Log in
                </button>
              </div>
              <div class="mt-6">
                <button id="google-signin-button"
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  Sign in with Google
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
    const loginButton = document.getElementById('login-button');
    const loginForm = document.getElementById('login-form');
    const googleSignInButton = document.getElementById('google-signin-button');
    
    if (loginButton) {
      loginButton.addEventListener('click', () => this.handleLogin());
    }
    
    if (loginForm) {
      loginForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleLogin();
        }
      });
    }

    if (googleSignInButton) {
      googleSignInButton.addEventListener('click', (e) => {
        // e.preventDefault();
        this.handleGoogleSignIn();
      })
    }
  }

  private async handleGoogleSignIn(): Promise<void> {
    console.log('inside handleGoogleSignIn()');
    // const auth2 = gapi.auth2.getAuthInstance();
    // auth2.signIn().then((googleUser) => {
    //   const token = googleUser.getAuthResponse().id_token;
      
    //   // Send the token to the backend for verification
    //   this.verifyGoogleToken(token)
    //     .then((result) => {
    //       if (result.success) {
    //         // User successfully logged in with Google
    //         sessionStorage.setItem('userId', result.user.id);
    //         this.router.navigateTo('/home');
    //       } else {
    //         // Handle error
    //         console.error('Google sign-in failed:', result.error);
    //       }
    //     })
    //     .catch((error) => {
    //       console.error('Error during Google login:', error);
    //     });
    // }).catch((error) => {
    //   console.error('Error signing in with Google:', error);
    // });
  }
  
  private async handleLogin(): Promise<void> {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const errorMessage = document.getElementById('error-message');
    const loginMessage = document.getElementById('login-message');
    
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
        // this.controlAccess.setAuthenticated(true);
        if (result.user.id) {
          sessionStorage.setItem('userId', result.user.id);
        }
        // this.router.navigateTo('/home');
        // Check if user's preferred 2FA option is set
        if (result.user.otp_option !== null) {
          if (result.user.otp_option === 'app') {
            console.log('Check authenticator app for the OTP');
            this.router.navigateTo('/otp/verify');
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

        // Navigation is handled by the ControlAccess via its event listener in the router
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
}