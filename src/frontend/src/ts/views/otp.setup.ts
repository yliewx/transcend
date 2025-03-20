import { Page } from '../types';
import { Router } from '../router';

export class OTPSetupPage implements Page {
  private router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'py-10';

    container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
                <p class="mt-2 text-sm text-gray-600">Enhance your account security by setting up 2FA.</p>
              </div>
              
              <div class="mt-8">
                <div class="space-y-4">
                  <h2 class="text-lg font-medium text-gray-700">Select your preferred verification method:</h2>
                  
                  <!-- Method selection radio buttons -->
                  <div class="space-y-3">
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="radio" name="2fa-method" id="2fa-sms" class="h-4 w-4 text-indigo-600" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700">SMS Verification</span>
                        <span class="block text-xs text-gray-500">Receive OTP via text message</span>
                      </div>
                    </label>
                    
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="radio" name="2fa-method" id="2fa-email" class="h-4 w-4 text-indigo-600" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700">Email Verification</span>
                        <span class="block text-xs text-gray-500">Receive OTP via email</span>
                      </div>
                    </label>
                    
                    <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input type="radio" name="2fa-method" id="2fa-app" class="h-4 w-4 text-indigo-600" />
                      <div class="ml-3">
                        <span class="block text-sm font-medium text-gray-700">Authenticator App</span>
                        <span class="block text-xs text-gray-500">Receive OPT via Google Authenticator</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                <!-- SMS Setup Section (initially hidden) -->
                <div id="sms-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700">Set up SMS verification</h3>
                    <p class="text-sm text-gray-600">Enter the mobile number with which you want to enable 2FA.</p>
                    
                    <div>
                      <label for="phone-number" class="block text-sm font-medium text-gray-700">Phone Number</label>
                      <div class="mt-1">
                        <input type="tel" id="phone-number" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="+1 (555) 123-4567" />
                      </div>
                    </div>
                    
                    <button id="enable-sms" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Enable SMS Verification
                    </button>
                  </div>
                </div>
                
                <!-- Email Setup Section (initially hidden) -->
                <div id="email-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700">Set up Email verification</h3>
                    <p class="text-sm text-gray-600">Enter the email address with which you want to enable 2FA.</p>
                    
                    <div>
                      <label for="email-address" class="block text-sm font-medium text-gray-700">Email Address</label>
                      <div class="mt-1">
                        <input type="email" id="email-address" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="you@example.com" />
                      </div>
                    </div>
                    
                    <button id="enable-email" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Enable Email Verification
                    </button>
                  </div>
                </div>
                
                <!-- App Setup Section (initially hidden) -->
                <div id="app-setup" class="mt-6 hidden">
                  <div class="space-y-4">
                    <h3 class="text-md font-medium text-gray-700">Set up Authenticator App</h3>
                    <p class="text-sm text-gray-600">Follow these steps to set up your authenticator:</p>
                    
                    <ol class="list-decimal pl-5 text-sm text-gray-600 space-y-2">
                      <li>Download and install Google Authenticator (or similar app)</li>
                      <li>Scan the QR code below using the app</li>
                      <li>Use the app to generate codes when you log in</li>
                    </ol>
                    
                    <div class="flex justify-center">
                      <div id="qr-placeholder" class="w-48 h-48 bg-gray-100 flex items-center justify-center">
                        <span class="text-gray-400">QR Code will appear here</span>
                      </div>
                    </div>
                    
                    <div class="text-center">
                      <p class="text-sm text-gray-600 mb-2">If you can't scan the QR code, enter this key manually:</p>
                      <div id="secret-key" class="font-mono bg-gray-100 p-2 rounded text-sm">ABCDEF123456</div>
                    </div>
                    
                    <button id="enable-app" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Enable App Verification
                    </button>
                  </div>
                </div>
                
                <!-- Success Section (initially hidden) -->
                <div id="success-section" class="mt-6 hidden">
                  <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                      <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 class="mt-3 text-lg font-medium text-gray-900">Two-factor authentication enabled!</h3>
                    <p class="mt-2 text-sm text-gray-600">
                      Your account is now more secure. You'll be asked for a verification code when you sign in.
                    </p>
                    <div class="mt-4">
                      <button id="continue-button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
    
    setTimeout(() => this.attachEventListeners(), 0);
    
    return container;
  }
  
  private attachEventListeners(): void {
    // Method selection radio buttons
    const smsRadio = document.getElementById('2fa-sms') as HTMLInputElement;
    const emailRadio = document.getElementById('2fa-email') as HTMLInputElement;
    const appRadio = document.getElementById('2fa-app') as HTMLInputElement;
    
    // Setup sections
    const smsSetup = document.getElementById('sms-setup');
    const emailSetup = document.getElementById('email-setup');
    const appSetup = document.getElementById('app-setup');
    
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
    appRadio?.addEventListener('change', () => {
      this.hideSection(smsSetup);
      this.hideSection(emailSetup);
      this.showSection(appSetup);
    });
    
    // Action buttons
    const enableSmsBtn = document.getElementById('enable-sms');
    const enableEmailBtn = document.getElementById('enable-email');
    const enableAppBtn = document.getElementById('enable-app');
    const continueBtn = document.getElementById('continue-button');
    
    // When enable buttons are clicked, show success section
    enableSmsBtn?.addEventListener('click', () => {
      this.showSuccessSection();
    });
    
    enableEmailBtn?.addEventListener('click', () => {
      this.showSuccessSection();
    });
    
    enableAppBtn?.addEventListener('click', () => {
      this.showSuccessSection();
    });
    
    // When continue button is clicked
    continueBtn?.addEventListener('click', () => {
      console.log('Continue to otp verification page');
      this.router.navigateTo('/otp/verify');
    });
  }
  
  private showSuccessSection(): void {
    // Hide all setup sections
    this.hideSection(document.getElementById('sms-setup'));
    this.hideSection(document.getElementById('email-setup'));
    this.hideSection(document.getElementById('app-setup'));
    
    // Show success section
    this.showSection(document.getElementById('success-section'));
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