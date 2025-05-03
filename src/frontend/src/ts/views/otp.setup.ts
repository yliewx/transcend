import { Page } from '../types';
import { Router } from '../router';
import { AuthService } from '../services/auth.service';

export class OTPSetupPage implements Page {
  private router: Router;
  private authService: AuthService;
  private element: HTMLElement | null = null;
  private selectedOption: string | null;
  constructor(router: Router) {
    this.router = router;
    this.authService = router.getControlAccess().getAuthService();
    this.selectedOption = null;
  }

  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';

    const inner = document.createElement('div');
    inner.className = 'px-4 py-6 sm:px-0';

    const userEmail = sessionStorage.getItem('userEmail') || 'you@example.com';

    inner.innerHTML = `
      <div class="card bg-white dark:bg-gray-900 shadow-md rounded-lg p-8">
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Set Up Two-Factor Authentication</h1>
          <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">Enhance your account security by setting up 2FA.</p>
        </div>
        
        <div class="mt-8">
          <div class="space-y-4">
            <h2 class="card-title">Select your preferred verification method:</h2>
            
            <!-- OTP Method -->
            <div class="space-y-3">
              <label class="flex items-center p-3 border rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 cursor-pointer">
                <input type="radio" name="2fa-method" id="tfa-sms" class="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <div class="ml-3 text-left">
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">SMS Verification</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via text message</span>
                </div>
              </label>
              
              <label class="flex items-center p-3 border rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 cursor-pointer">
                <input type="radio" name="2fa-method" id="tfa-email" class="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <div class="ml-3 text-left">
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Verification</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via email</span>
                </div>
              </label>
              
              <label class="flex items-center p-3 border rounded-lg hover:bg-pink-50 dark:hover:bg-gray-800 cursor-pointer">
                <input type="radio" name="2fa-method" id="tfa-app" class="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <div class="ml-3 text-left">
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Authenticator App</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via Google Authenticator</span>
                </div>
              </label>
            </div>
          </div>
          
          <!-- SMS Setup Section -->
          <div id="sms-setup" class="mt-6 hidden">
            <div class="card">
              <h3 class="card-title">Set up SMS verification</h3>
              <p class="card-description">Enter the mobile number you want to use for 2FA.</p>
              
              <div class="mb-4">
                <label for="phone-number" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <div class="mt-1">
                  <input type="tel" id="phone-number" maxlength="20" class="input-field" placeholder="+6590074072" />
                </div>
              </div>
              
              <button id="enable-sms" class="card-button">
                Enable SMS Verification
              </button>
            </div>
          </div>
          
          <!-- Email Setup Section -->
          <div id="email-setup" class="mt-6 hidden">
            <div class="card">
              <h3 class="card-title">Set up Email verification</h3>
              <p class="card-description">Enter the email address you want to use for 2FA.</p>
              
              <div class="mb-4">
                <label for="email-address" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <div class="mt-1">
                  <input type="email" id="email-address" maxlength="40" class="input-field" value="${userEmail}" />
                </div>
              </div>
              
              <button id="enable-email" class="card-button">
                Enable Email Verification
              </button>
            </div>
          </div>
          
          <!-- App Setup Section -->
          <div id="app-setup" class="mt-6 hidden">
            <div class="card">
              <h3 class="card-title">Set up Authenticator App</h3>
              <p class="card-description">Follow these steps to set up your authenticator:</p>
              
              <ol class="list-decimal pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-4 text-left">
                <li>Download and install Google Authenticator (or similar app)</li>
                <li>Scan the QR code below using the app</li>
                <li>Use the app to generate codes when you log in</li>
              </ol>
              
              <div class="flex justify-center mb-4">
                <div id="qr-placeholder" class="w-48 h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span class="text-gray-400 dark:text-gray-600">QR Code will appear here</span>
                </div>
              </div>
              
              <div class="text-center mb-4">
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">If you can't scan the QR code, enter this key manually:</p>
                <div id="secret-key" class="font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm text-gray-600 dark:text-gray-300">ABCDEF123456</div>
              </div>
              
              <button id="enable-app" class="card-button">
                Enable App Verification
              </button>
            </div>
          </div>
          
          <!-- Success Section -->
          <div id="success-section" class="mt-6 hidden">
            <div class="card bg-green-50 dark:bg-green-900">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-700 mb-4">
                <svg class="h-6 w-6 text-green-600 dark:text-green-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 class="card-title text-green-600 dark:text-green-400">Two-factor authentication enabled!</h3>
              <p class="card-description">
                Your account is now more secure. You'll be asked for a verification code when you sign in.
              </p>
              <button id="continue-button" class="btn-success">
                Continue to OTP Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(inner);
    
    this.element = container;    
    this.setupEventHandlers();

    return container;
  }

  update(): void {
    if (this.element) {
      const smsSetup = this.element.querySelector('#sms-setup');
      const emailSetup = this.element.querySelector('#email-setup');
      const appSetup = this.element.querySelector('#app-setup');
      const successSection = this.element.querySelector('#success-section');
      
      if (smsSetup) smsSetup.classList.add('hidden');
      if (emailSetup) emailSetup.classList.add('hidden');
      if (appSetup) appSetup.classList.add('hidden');
      if (successSection) successSection.classList.add('hidden');
      
      const radioButtons = this.element.querySelectorAll('input[type="radio"]');
      radioButtons.forEach(btn => (btn as HTMLInputElement).checked = false);
    }
  }

  private setupEventHandlers(): void {
    if (!this.element) return;
    
    const smsRadio = this.element?.querySelector('#tfa-sms') as HTMLInputElement;
    const emailRadio = this.element?.querySelector('#tfa-email') as HTMLInputElement;
    const appRadio = this.element?.querySelector('#tfa-app') as HTMLInputElement;
    const smsSetup = this.element?.querySelector('#sms-setup') as HTMLElement;
    const emailSetup = this.element?.querySelector('#email-setup') as HTMLElement;
    const appSetup = this.element?.querySelector('#app-setup') as HTMLElement;
    const qrPlaceholder = this.element?.querySelector('#qr-placeholder');
    const secretKey = this.element?.querySelector('#secret-key');
    
    smsRadio?.addEventListener('change', () => {
      this.showSection(smsSetup);
      this.hideSection(emailSetup);
      this.hideSection(appSetup);
    });
    
    emailRadio?.addEventListener('change', () => {
      this.hideSection(smsSetup);
      this.showSection(emailSetup);
      this.hideSection(appSetup);
    });
    
    appRadio?.addEventListener('change', async () => {
      this.hideSection(smsSetup);
      this.hideSection(emailSetup);
      this.showSection(appSetup);

      try {
        const response = await this.authService.generateQRCode();
        if (response.success && response.qrCode && qrPlaceholder && secretKey) {
          qrPlaceholder.innerHTML = `<img src="${response.qrCode}" alt="QR Code" class="w-48 h-48" />`;
          secretKey.textContent = response.secret;
        } else {
          alert("Failed to generate QR code. Please try again.");
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
        alert("An error occurred while generating the QR code.");
      }
    });
    
    const enableSmsBtn = this.element.querySelector('#enable-sms');
    const enableEmailBtn = this.element.querySelector('#enable-email');
    const enableAppBtn = this.element.querySelector('#enable-app');
    const continueBtn = this.element.querySelector('#continue-button');

    enableSmsBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'sms';

        const phoneInput = document.getElementById('phone-number') as HTMLInputElement;
        const phoneNumber = phoneInput.value;
        
        if (!phoneNumber || !this.isValidPhoneNumber(phoneNumber)) {
          alert('Please enter a valid phone number');
          return;
        }
        
        const result = await this.authService.update2FAMethod("sms", phoneNumber);
        
        if (result.success) {
          this.showSuccessSection();
        } else {
          alert(`Failed to enable SMS verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling SMS verification:', error);
        alert('An error occurred while enabling SMS verification. Please try again.');
      }
    });
    
    enableEmailBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'email';

        const emailInput = document.getElementById('email-address') as HTMLInputElement;
        const email = emailInput.value;
        
        if (!email || email.length > 40 || !this.isValidEmail(email)) {
          alert('Please enter a valid email address');
          return;
        }
        
        const result = await this.authService.update2FAMethod("email", email);
        
        if (result.success) {
          this.showSuccessSection();
        } else {
          alert(`Failed to enable Email verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling Email verification:', error);
        alert('An error occurred while enabling Email verification. Please try again.');
      }
    });
    
    enableAppBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'app';
        const secretKey = document.getElementById('secret-key')?.textContent || '';        
        const result = await this.authService.update2FAMethod("app", secretKey);
        
        if (result.success) {
          this.showSuccessSection();
        } else {
          alert(`Failed to enable Authenticator App verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling App verification:', error);
        alert('An error occurred while enabling Authenticator App verification. Please try again.');
      }
    });
    
    continueBtn?.addEventListener('click', async () => {
      try {
        if (this.selectedOption === 'app') {
          this.router.navigateTo('/otp/verify');
          return;
        }

        const result = await this.authService.generateOtp();
        
        if (result.success) {
          this.router.navigateTo('/otp/verify');
        } else {
          console.error('Failed to generate OTP:', result.message);
          alert(`Failed to generate OTP: ${result.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error generating OTP:', error);
        alert('An error occurred while generating OTP. Please try again.');
      }
    });
  }

  private isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    const cleanedNumber = phoneNumber.replace(/[\s()+\-\.]/g, '');
    const phoneRegex = /^\d{7,15}$/;
    return phoneRegex.test(cleanedNumber);
  }
  
  private showSuccessSection(): void {
    if (!this.element) return;    
    this.hideSection(this.element.querySelector('#sms-setup'));
    this.hideSection(this.element.querySelector('#email-setup'));
    this.hideSection(this.element.querySelector('#app-setup'));    
    this.showSection(this.element.querySelector('#success-section'));
  }
  
  private showSection(element: HTMLElement | null): void {
    if (element) {
      element.classList.remove('hidden');
    }
  }
  
  private hideSection(element: HTMLElement | null): void {
    if (element) {
      element.classList.add('hidden');
    }
  }
}