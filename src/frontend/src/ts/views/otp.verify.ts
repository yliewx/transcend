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
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
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
                  <button type="submit" id="verify-otp"
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
    
    // Cache the element
    this.element = container;
    
    // Set up event handlers
    this.setupEventHandlers();

    return container;
  }

  update(): void {
    // Reset form when revisiting the page
    if (this.element) {
      // Clear OTP inputs
      const otpInputs = Array.from({ length: 6 }).map((_, i) => 
        this.element?.querySelector(`#otp-${i}`) as HTMLInputElement
      );
      
      otpInputs.forEach(input => {
        if (input) input.value = '';
      });
      
      // Hide error message
      const errorMessage = this.element.querySelector('#error-message');
      if (errorMessage) errorMessage.classList.add('hidden');
      
      // Focus on first input
      if (otpInputs[0]) otpInputs[0].focus();
    }
  }

  private setupEventHandlers(): void {
    if (!this.element) return;
  
    const otpInputs = Array.from({ length: 6 }).map((_, i) =>
      this.element?.querySelector(`#otp-${i}`) as HTMLInputElement
    );
  
    // OTP input behavior
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
    
    // Submit OTP on enter or button click
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleOTPVerification();
    });
  
    // Resend OTP button
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
    
    // Basic validation
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
        // Show success message
        console.log("OTP verified. Login successful");
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
      console.log('Generating new OTP to resend');
      const result = await this.controlAccess.getAuthService().generateOtp();
      
      if (result.success) {
        console.log('OTP generated successfully');
        
        // Show confirmation to user
        if (this.element) {
          const errorMessage = this.element.querySelector('#error-message');
          if (errorMessage) {
            errorMessage.textContent = 'A new verification code has been sent.';
            errorMessage.classList.remove('hidden');
            errorMessage.classList.remove('text-red-600');
            errorMessage.classList.add('text-green-600');
            
            // Reset to error styling after 3 seconds
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