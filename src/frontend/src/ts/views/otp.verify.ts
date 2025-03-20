import { Page } from '../types';
import { Router } from '../router';
import { AuthService } from '../services/auth.service';

export class OTPVerificationPage implements Page {
  private router: Router;
  private authService: AuthService;

  constructor(router: Router) {
    this.router = router;
    this.authService = router.getControlAccess().getAuthService();
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'py-10';

    container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-900">Enter OTP Code</h1>
                <p class="mt-2 text-sm text-gray-600">We have sent a 6-digit verification code to your registered device.</p>
              </div>
              
              <form id="otp-form" class="mt-8 space-y-6">
                <div class="flex justify-center gap-2">
                  ${Array.from({ length: 6 }).map((_, i) => `
                    <input id="otp-${i}" type="text" maxlength="1" 
                      class="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  `).join('')}
                </div>
                
                <div id="error-message" class="text-red-600 text-sm hidden text-center mt-2"></div>
                
                <div>
                  <button type="button" id="verify-otp"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Verify OTP
                  </button>
                </div>
                <p class="text-sm text-center text-gray-600 mt-2">
                  Didn't receive the code? <button id="resend-otp" class="text-indigo-600 hover:text-indigo-500">Resend OTP</button>
                </p>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;
    
    setTimeout(() => this.attachEventListeners(), 0);

    return container;
  }

  private attachEventListeners(): void {
    const otpInputs = Array.from({ length: 6 }).map((_, i) => document.getElementById(`otp-${i}`) as HTMLInputElement);
    const verifyButton = document.getElementById('verify-otp');
    const resendButton = document.getElementById('resend-otp');
    
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (input.value.length === 1 && index < 5) {
          otpInputs[index + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });
    
    verifyButton?.addEventListener('click', () => this.handleOTPVerification());
    resendButton?.addEventListener('click', () => this.resendOTP());
  }

  private async handleOTPVerification(): Promise<void> {
    const otpInputs = Array.from({ length: 6 }).map((_, i) => (document.getElementById(`otp-${i}`) as HTMLInputElement).value);
    const errorMessage = document.getElementById('error-message');
    const otpCode = otpInputs.join('');
    
    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      if (errorMessage) {
        errorMessage.textContent = 'Invalid OTP. Please enter a 6-digit code.';
        errorMessage.classList.remove('hidden');
      }
      return;
    }
    
    try {
      // Retrieve user id from session storage
      const user_id = sessionStorage.getItem('user_id');
      if (!user_id) {
        console.error("No user ID found in session storage. Redirecting to login.");
        this.router.navigateTo('/login');
      }

      const result = await this.authService.verifyOtp(otpCode);
      if (result.success) {
        // Show success message
        console.log("OTP verified. Login successful")
      } else {
        if (errorMessage) {
          errorMessage.textContent = result.message || 'OTP verification failed. Please try again.';
          errorMessage.classList.remove('hidden');
        }
      }
    } catch (error) {
      if (errorMessage) {
        errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        errorMessage.classList.remove('hidden');
      }
      console.error('OTP verification error:', error);
    }
  }
  
  private async resendOTP(): Promise<void> {
    console.log('resendOTP placeholder, not implemented yet');
  }
}
