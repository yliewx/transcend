import { Page } from '../types';
import { Router } from '../router';
import { UserService } from '../services/user.service';
import { Notifications } from '../components/notifications';

export class ProfilePage implements Page {
  private router: Router;
  private userService: UserService;
  private userProfile: any = null;
  private element: HTMLElement | null = null;
  
  constructor(router: Router, userService: UserService) {
    this.router = router;
    this.userService = userService;
  }
  
  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    
    container.innerHTML = `
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="card dark:bg-gray-900 p-8">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Edit Your Profile</h1>
              <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
                Update your personal information and settings
              </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <!-- Avatar Section -->
              <div class="md:col-span-1">
                <div class="bg-pink-50 dark:bg-pink-900/30 p-6 rounded-lg text-center">
                  <h2 class="text-xl font-bold text-pink-600 dark:text-pink-400 mb-4">Profile Picture</h2>
                  <div class="avatar-container mb-4">
                    <img 
                      id="current-avatar" 
                      crossorigin="use-credentials"
                      src="/api/profile/avatar"
                      alt="Profile picture" 
                      class="w-40 h-40 rounded-full mx-auto object-cover border-4 border-pink-200 dark:border-pink-900"
                    >
                  </div>
                  <div class="mt-4">
                    <label for="avatar-upload" class="btn-primary cursor-pointer">
                      Upload New Picture
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" class="hidden">
                    <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">JPG or PNG. Max size 5MB.</p>
                  </div>
                </div>
              </div>
              
              <!-- Profile Form Section -->
              <div class="md:col-span-2">
                <form id="profile-form" class="space-y-6 text-left">
                  <!-- Username -->
                  <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input 
                      type="text" 
                      id="username" 
                      name="username" 
                      value="a"
                      maxlength="20"
                      class="input-field"
                    >
                  </div>
                  
                  <!-- Display Name -->
                  <div>
                    <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                    <input 
                      type="text" 
                      id="displayName" 
                      name="displayName" 
                      value="a"
                      maxlength="20"
                      class="input-field"
                    >
                  </div>
                  
                  <!-- Email -->
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      value="a@gmail.com"
                      maxlength="40"
                      class="input-field"
                    >
                  </div>
                  
                  <!-- Change Password Section -->
                  <div id="password-section" class="pt-4 border-t border-gray-200 dark:border-gray-600 hidden">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4 text-center">Change Password</h3>
                    
                    <!-- Current Password -->
                    <div class="mb-4">
                      <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                      <input 
                        type="password" 
                        id="currentPassword" 
                        name="currentPassword" 
                        maxlength="20"
                        class="input-field"
                      >
                    </div>
                    
                    <!-- New Password -->
                    <div class="mb-4">
                      <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                      <input 
                        type="password" 
                        id="newPassword" 
                        maxlength="20"
                        class="input-field"
                      >
                    </div>
                    
                    <!-- Confirm New Password -->
                    <div>
                      <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                      <input 
                        type="password" 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        class="input-field"
                      >
                    </div>
                  </div>
                  
                  <!-- Form Buttons -->
                  <div class="flex justify-end space-x-4 pt-4">
                    <button 
                      type="button" 
                      id="cancel-button" 
                      class="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      class="btn-primary"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>               
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.element = container;

    this.setupEventHandlers();
    
    setTimeout(() => {
      this.fetchProfileData().then(() => {
        this.updateUIWithProfileData();
      });
    }, 0);
    
    return container;
  }
  
  async update(): Promise<void> {
    if (this.element) {
      await this.fetchProfileData();
      this.updateUIWithProfileData();
    }
  }

  private async fetchProfileData(): Promise<void> {
    try {
      const profileResponse = await this.userService.getProfile();
      
      if (profileResponse.success) {
        this.userProfile = profileResponse;
        this.updateUIWithProfileData();
      } else {
        console.error('Failed to fetch profile:', profileResponse.error);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }

  private updateUIWithProfileData(): void {
    if (!this.element) return;
    
    const avatarImg = this.element.querySelector('#current-avatar') as HTMLImageElement;
    if (avatarImg) {
      avatarImg.src = `/api/profile/avatar?t=${new Date().getTime()}`;
    }
    
    if (this.userProfile) {
      const usernameInput = this.element.querySelector('#username') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.value = this.userProfile?.userData?.username || '';
      }
      
      const displayNameInput = this.element.querySelector('#displayName') as HTMLInputElement;
      if (displayNameInput) {
        displayNameInput.value = this.userProfile?.profileData?.displayName || '';
      }
      
      const emailInput = this.element.querySelector('#email') as HTMLInputElement;
      if (emailInput) {
        emailInput.value = this.userProfile?.userData?.email || '';
      }
      
      const passwordSection = this.element.querySelector('#password-section');
      if (passwordSection) {
        const otpOption = this.userProfile?.userData?.otp_option || null;
        
        if (otpOption === null) {
          passwordSection.classList.add('hidden');
        } else {
          passwordSection.classList.remove('hidden'); 
        }
      }
    }
  }
   
  private setupEventHandlers(): void {
    if (!this.element) return;
    
    const avatarUpload = this.element.querySelector('#avatar-upload') as HTMLInputElement;
    if (avatarUpload) {
      avatarUpload.addEventListener('change', e => this.handleAvatarUpload(e));
    }
    
    const profileForm = this.element.querySelector('#profile-form') as HTMLFormElement;
    if (profileForm) {
      profileForm.addEventListener('submit', e => this.handleFormSubmit(e));
    }
    
    const cancelButton = this.element.querySelector('#cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.router.navigateTo('/home');
      });
    }
  }
  
  private async handleAvatarUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
  
    const file = input.files[0];
    
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.showNotification('Please select a valid image file (JPG or PNG)', 'error');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showNotification('Image size must be less than 5MB', 'error');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const avatarContainer = this.element?.querySelector('.avatar-container');
      if (avatarContainer) {
        avatarContainer.classList.add('opacity-50');
      }
      
      const result = await this.userService.uploadAvatar(formData);
      
      if (result.success) {
        const avatarImg = this.element?.querySelector('#current-avatar') as HTMLImageElement;
        if (avatarImg) {
          avatarImg.src = `/api/profile/avatar?t=${new Date().getTime()}`;
        }
        
        this.showNotification('Profile picture updated successfully', 'success');
      } else {
        this.showNotification(`Failed to upload image: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      this.showNotification('Failed to upload profile picture', 'error');
    } finally {
      const avatarContainer = this.element?.querySelector('.avatar-container');
      if (avatarContainer) {
        avatarContainer.classList.remove('opacity-50');
      }
      
      input.value = '';
    }
  }
  
  private async handleFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.element) return;
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);    

    const username = formData.get('username') as string;
    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (username && (username.length < 3 || username.length > 20)) {
      this.showNotification('Username must be between 3 and 20 characters', 'error');
      return;
    }
    if (displayName && (displayName.length < 3 || displayName.length > 20)) {
      this.showNotification('Display name must be between 3 and 20 characters', 'error');
      return;
    }
    if (email && email.length > 40) {
      this.showNotification('Email cannot exceed 40 characters', 'error');
      return;
    }
    
    if (this.userProfile?.userData?.otp_option === null && (currentPassword || newPassword || confirmPassword)) {
      this.showNotification('Password cannot be changed when signed in with google authentication', 'error');
      return;
    }
    
    if (currentPassword || newPassword || confirmPassword) {
      if (currentPassword && (currentPassword.length < 8 || currentPassword.length > 20)) {
        this.showNotification('Current password must be between 8 and 20 characters', 'error');
        return;
      }
      if (newPassword && (newPassword.length < 8 || newPassword.length > 20)) {
        this.showNotification('New password must be between 8 and 20 characters', 'error');
        return;
      }    
      if (newPassword && newPassword !== confirmPassword) {
        this.showNotification('New passwords do not match', 'error');
        return;
      }
    }

    const userDataUpdate = {
      username: (formData.get('username') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
    };
    
    const profileDataUpdate = {
      displayName: (formData.get('displayName') as string) || undefined,
    };
    
    const passwordData = (newPassword && this.userProfile?.userData?.otp_option !== null) ? {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: newPassword,
    } : null;
    
    try {      
      let hasError = false;
      
      if (Object.keys(userDataUpdate).length > 0) {
        const userResult = await this.userService.updateUserData(userDataUpdate);
        if (!userResult.success) {
          this.showNotification(`User data update failed: ${userResult.error}`, 'error');
          hasError = true;
        }
      }
      
      if (!hasError && Object.keys(profileDataUpdate).length > 0) {
        const profileResult = await this.userService.updateProfileData(profileDataUpdate);
        if (!profileResult.success) {
          this.showNotification(`Profile data update failed: ${profileResult.error}`, 'error');
          hasError = true;
        }
      }
      
      if (!hasError && passwordData) {
        const passwordResult = await this.userService.updatePassword(passwordData);
        if (!passwordResult.success) {
          const errorMessage = passwordResult.error || 'Password update failed';
          this.showNotification(errorMessage, 'error');
          hasError = true;
          
          const newPasswordField = this.element.querySelector('#newPassword') as HTMLInputElement;
          const confirmPasswordField = this.element.querySelector('#confirmPassword') as HTMLInputElement;
          const currentPasswordField = this.element.querySelector('#currentPassword') as HTMLInputElement;
          
          if (newPasswordField) newPasswordField.value = '';
          if (confirmPasswordField) confirmPasswordField.value = '';
          if (currentPasswordField) currentPasswordField.value = '';          
          if (currentPasswordField) currentPasswordField.focus();
        }
      }
      
      if (!hasError) {
        this.showNotification('Profile updated successfully', 'success');        
        await this.fetchProfileData();
        this.updateUIWithProfileData();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showNotification('Failed to update profile', 'error');
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error'): void {
    const duration = type === 'error' ? 8000 : 5000;
    Notifications.show(type, message, duration);
  }
}