import { Page } from '../types';
import { Router } from '../router';
import { ControlAccess } from '../services/control.access';

export class OTPVerificationPage implements Page {
  private router: Router;
  private controlAccess: ControlAccess;
  private element: HTMLElement | null = null;

  constructor(router: Router) {
    this.router = router;
    this.controlAccess = router.getControlAccess();
  }

  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'py-10';

    container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-gray-800 dark:bg-gray-900 shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-white">Enter OTP Code</h1>
                <p class="mt-2 text-sm text-gray-300">We have sent a 6-digit verification code to your registered device.</p>
              </div>
              
              <form id="otp-form" class="mt-8 space-y-6">
                <div class="flex justify-center gap-2">
                  ${Array.from({ length: 6 }).map((_, i) => `
                    <input id="otp-${i}" type="text" maxlength="1" 
                      class="w-12 h-12 text-center text-xl font-semibold border border-gray-500 dark:border-gray-600 bg-gray-700 dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-white"
                    />
                  `).join('')}
                </div>
                
                <div id="error-message" class="text-red-600 text-sm hidden text-center mt-2"></div>
                
                <div>
                  <button type="submit" id="verify-otp"
                    class="w-full card-button">
                    Verify OTP
                  </button>
                </div>
                <p class="text-sm text-center text-gray-300 mt-2">
                  Didn't receive the code? <button id="resend-otp" class="text-pink-400 hover:text-pink-300">Resend OTP</button>
                </p>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;
    
    this.element = container;
    
    this.setupEventHandlers();

    return container;
  }

  update(): void {
    if (this.element) {
      const otpInputs = Array.from({ length: 6 }).map((_, i) => 
        this.element?.querySelector(`#otp-${i}`) as HTMLInputElement
      );
      
      otpInputs.forEach(input => {
        if (input) input.value = '';
      });
      
      const errorMessage = this.element.querySelector('#error-message');
      if (errorMessage) errorMessage.classList.add('hidden');
      
      if (otpInputs[0]) otpInputs[0].focus();
    }
  }

  private setupEventHandlers(): void {
    if (!this.element) return;
  
    const otpInputs = Array.from({ length: 6 }).map((_, i) =>
      this.element?.querySelector(`#otp-${i}`) as HTMLInputElement
    );
  
    otpInputs.forEach((input, index) => {
      if (!input) return;
  
      input.addEventListener('input', () => {
        if (input.value.length === 1 && index < 5 && otpInputs[index + 1]) {
          otpInputs[index + 1].focus();
        }
      });
  
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0 && otpInputs[index - 1]) {
          otpInputs[index - 1].focus();
        }
      });
    });
  
    const form = this.element.querySelector('#otp-form') as HTMLFormElement;
    const resendButton = this.element.querySelector('#resend-otp');
    
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleOTPVerification();
    });
  
    resendButton?.addEventListener('click', (e) => {
      e.preventDefault();
      this.resendOTP();
    });
  }  

  private async handleOTPVerification(): Promise<void> {
    if (!this.element) return;
    
    const otpInputs = Array.from({ length: 6 }).map((_, i) => 
      (this.element?.querySelector(`#otp-${i}`) as HTMLInputElement)?.value || ''
    );
    
    const errorMessage = this.element.querySelector('#error-message');
    const otpCode = otpInputs.join('');
    
    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      if (errorMessage) {
        errorMessage.textContent = 'Invalid OTP. Please enter a 6-digit code.';
        errorMessage.classList.remove('hidden');
      }
      return;
    }
    
    try {
      const result = await this.controlAccess.verifyOtp(otpCode);
      if (result.success) {
        this.router.navigateTo('/home');
      } else {
        if (errorMessage) {
          errorMessage.textContent = result.error || 'OTP verification failed. Please try again.';
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
    try {
      const result = await this.controlAccess.getAuthService().generateOtp();
      
      if (result.success) {        
        if (this.element) {
          const errorMessage = this.element.querySelector('#error-message');
          if (errorMessage) {
            errorMessage.textContent = 'A new verification code has been sent.';
            errorMessage.classList.remove('hidden');
            errorMessage.classList.remove('text-red-600');
            errorMessage.classList.add('text-green-600');
            
            setTimeout(() => {
              errorMessage.classList.add('hidden');
              errorMessage.classList.add('text-red-600');
              errorMessage.classList.remove('text-green-600');
            }, 3000);
          }
        }
      } else {
        console.error('Failed to generate OTP:', result.message);
        alert(`Failed to generate OTP: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating OTP:', error);
      alert('An error occurred while generating OTP. Please try again.');
    }
  }
}