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
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'py-10';

    const userEmail = sessionStorage.getItem('userEmail') || 'you@example.com';

    container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-900 shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Set Up Two-Factor Authentication</h1>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Enhance your account security by setting up 2FA.</p>
              </div>
              
              <div class="mt-8">
                <div class="space-y-4">
                  <h2 class="text-lg font-medium text-gray-700 dark:text-gray-300">Select your preferred verification method:</h2>
                  
                  <!-- Method selection radio buttons -->
                  <div class="space-y-3">
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input type="radio" name="2fa-method" id="tfa-sms" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">SMS Verification</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via text message</span>
                      </div>
                    </label>
                    
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input type="radio" name="2fa-method" id="tfa-email" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Verification</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via email</span>
                      </div>
                    </label>
                    
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input type="radio" name="2fa-method" id="tfa-app" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Authenticator App</span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">Receive OTP via Google Authenticator</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <!-- SMS Setup Section (initially hidden) -->
                <div id="sms-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700 dark:text-gray-300">Set up SMS verification</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Enter the mobile number with which you want to enable 2FA.</p>
                    
                    <div>
                      <label for="phone-number" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                      <div class="mt-1">
                        <input type="tel" id="phone-number" class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white" placeholder="+1 (555) 123-4567" />
                      </div>
                    </div>
                    
                    <button id="enable-sms" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600">
                      Enable SMS Verification
                    </button>
                  </div>
                </div>
                
                <!-- Email Setup Section (initially hidden) -->
                <div id="email-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700 dark:text-gray-300">Set up Email verification</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Enter the email address with which you want to enable 2FA.</p>
                    
                    <div>
                      <label for="email-address" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                      <div class="mt-1">
                        <input type="email" id="email-address" class="block w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white" value="${userEmail}" />
                      </div>
                    </div>
                    
                    <button id="enable-email" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600">
                      Enable Email Verification
                    </button>
                  </div>
                </div>
                
                <!-- App Setup Section (initially hidden) -->
                <div id="app-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700 dark:text-gray-300">Set up Authenticator App</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Follow these steps to set up your authenticator:</p>
                    
                    <ol class="list-decimal pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li>Download and install Google Authenticator (or similar app)</li>
                      <li>Scan the QR code below using the app</li>
                      <li>Use the app to generate codes when you log in</li>
                    </ol>
                    
                    <div class="flex justify-center">
                      <div id="qr-placeholder" class="w-48 h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <span class="text-gray-400 dark:text-gray-600">QR Code will appear here</span>
                      </div>
                    </div>
                    
                    <div class="text-center">
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">If you can't scan the QR code, enter this key manually:</p>
                      <div id="secret-key" class="font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm text-gray-600 dark:text-gray-300">ABCDEF123456</div>
                    </div>
                    
                    <button id="enable-app" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600">
                      Enable App Verification
                    </button>
                  </div>
                </div>
                
                <!-- Success Section (initially hidden) -->
                <div id="success-section" class="mt-6 hidden">
                  <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-700">
                      <svg class="h-6 w-6 text-green-600 dark:text-green-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 class="mt-3 text-lg font-medium text-gray-900 dark:text-white">Two-factor authentication enabled!</h3>
                    <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Your account is now more secure. You'll be asked for a verification code when you sign in.
                    </p>
                    <div class="mt-4">
                      <button id="continue-button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600">
                        Continue to OTP Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
    // Reset the form state when revisiting the page
    if (this.element) {
      const smsSetup = this.element.querySelector('#sms-setup');
      const emailSetup = this.element.querySelector('#email-setup');
      const appSetup = this.element.querySelector('#app-setup');
      const successSection = this.element.querySelector('#success-section');
      
      if (smsSetup) smsSetup.classList.add('hidden');
      if (emailSetup) emailSetup.classList.add('hidden');
      if (appSetup) appSetup.classList.add('hidden');
      if (successSection) successSection.classList.add('hidden');
      
      // Reset radio buttons
      const radioButtons = this.element.querySelectorAll('input[type="radio"]');
      radioButtons.forEach(btn => (btn as HTMLInputElement).checked = false);
    }
  }

  private setupEventHandlers(): void {
    if (!this.element) return;
    
    // Method selection radio buttons
    const smsRadio = this.element?.querySelector('#tfa-sms') as HTMLInputElement;
    const emailRadio = this.element?.querySelector('#tfa-email') as HTMLInputElement;
    const appRadio = this.element?.querySelector('#tfa-app') as HTMLInputElement;
    
    // Setup sections
    const smsSetup = this.element?.querySelector('#sms-setup') as HTMLElement;
    const emailSetup = this.element?.querySelector('#email-setup') as HTMLElement;
    const appSetup = this.element?.querySelector('#app-setup') as HTMLElement;

    // QR code elements in appSetup section
    const qrPlaceholder = this.element?.querySelector('#qr-placeholder');
    const secretKey = this.element?.querySelector('#secret-key');
    
    // SMS radio button click handler
    smsRadio?.addEventListener('change', () => {
      this.showSection(smsSetup);
      this.hideSection(emailSetup);
      this.hideSection(appSetup);
    });
    
    // Email radio button click handler
    emailRadio?.addEventListener('change', () => {
      this.hideSection(smsSetup);
      this.showSection(emailSetup);
      this.hideSection(appSetup);
    });
    
    // App radio button click handler
    appRadio?.addEventListener('change', async () => {
      this.hideSection(smsSetup);
      this.hideSection(emailSetup);
      this.showSection(appSetup);

      // Display QR code
      try {
        console.log('Generating QR code...');
        const response = await this.authService.generateQRCode();
        if (response.success) {
          console.log('response secret:', response.secret);
        }

        // Update placeholders
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
    
    // Action buttons
    const enableSmsBtn = this.element.querySelector('#enable-sms');
    const enableEmailBtn = this.element.querySelector('#enable-email');
    const enableAppBtn = this.element.querySelector('#enable-app');
    const continueBtn = this.element.querySelector('#continue-button');

    // When enable SMS button is clicked
    enableSmsBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'sms';

        const phoneInput = document.getElementById('phone-number') as HTMLInputElement;
        const phoneNumber = phoneInput.value;
        
        if (!phoneNumber) {
          alert('Please enter a valid phone number');
          return;
        }
        
        // Call API to enable SMS 2FA
        const result = await this.authService.update2FAMethod("sms", phoneNumber);
        
        if (result.success) {
          // The server now knows which 2FA method is enabled
          // No need to store sensitive authentication data in client storage
          this.showSuccessSection();
        } else {
          alert(`Failed to enable SMS verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling SMS verification:', error);
        alert('An error occurred while enabling SMS verification. Please try again.');
      }
    });
    
    // When enable Email button is clicked
    enableEmailBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'email';

        const emailInput = document.getElementById('email-address') as HTMLInputElement;
        const email = emailInput.value;
        
        if (!email || !this.isValidEmail(email)) {
          alert('Please enter a valid email address');
          return;
        }
        
        // Call API to enable Email 2FA
        const result = await this.authService.update2FAMethod("email", email);
        
        if (result.success) {
          // The server now knows which 2FA method is enabled
          this.showSuccessSection();
        } else {
          alert(`Failed to enable Email verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling Email verification:', error);
        alert('An error occurred while enabling Email verification. Please try again.');
      }
    });
    
    // When enable App button is clicked
    enableAppBtn?.addEventListener('click', async () => {
      try {
        this.selectedOption = 'app';

        const secretKey = document.getElementById('secret-key')?.textContent || '';
        
        // Call API to confirm and enable App 2FA
        const result = await this.authService.update2FAMethod("app", secretKey);
        
        if (result.success) {
          // The server now knows which 2FA method is enabled
          this.showSuccessSection();
        } else {
          alert(`Failed to enable Authenticator App verification: ${result.message}`);
        }
      } catch (error) {
        console.error('Error enabling App verification:', error);
        alert('An error occurred while enabling Authenticator App verification. Please try again.');
      }
    });
    
    // When continue button is clicked
    continueBtn?.addEventListener('click', async () => {
      try {
        if (this.selectedOption === 'app') {
          console.log('App OTP is enabled. Navigating to verification page');
          this.router.navigateTo('/otp/verify');
          return;
        }

        console.log('Generating OTP before navigating to verification page');
        const result = await this.authService.generateOtp();
        
        if (result.success) {
          console.log('OTP generated successfully');
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
    
    // Basic email validation regex
    // Checks for format: something@something.something
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private showSuccessSection(): void {
    if (!this.element) return;
    
    // Hide all setup sections
    this.hideSection(this.element.querySelector('#sms-setup'));
    this.hideSection(this.element.querySelector('#email-setup'));
    this.hideSection(this.element.querySelector('#app-setup'));
    
    // Show success section
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