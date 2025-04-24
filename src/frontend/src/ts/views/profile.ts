import { Page } from '../types';
import { Router } from '../router';
import { UserService } from '../services/user.service';

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
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    
    // Set initial HTML content first (non-blocking)
    container.innerHTML = `
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900">Edit Your Profile</h1>
              <p class="mt-4 text-lg text-gray-600">
                Update your personal information and settings
              </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <!-- Avatar Section -->
              <div class="md:col-span-1">
                <div class="bg-indigo-50 p-6 rounded-lg text-center">
                  <h2 class="text-xl font-bold text-indigo-600 mb-4">Profile Picture</h2>
                  <div class="avatar-container mb-4">
                    <img 
                      id="current-avatar" 
                      src="/uploads/avatars/default-avatar.png" 
                      alt="Profile picture" 
                      class="w-40 h-40 rounded-full mx-auto object-cover border-4 border-indigo-200"
                    >
                  </div>
                  <div class="mt-4">
                    <label for="avatar-upload" class="inline-block bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 cursor-pointer">
                      Upload New Picture
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" class="hidden">
                    <p class="text-gray-500 text-sm mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                  </div>
                </div>
              </div>
              
              <!-- Profile Form Section -->
              <div class="md:col-span-2">
                <form id="profile-form" class="space-y-6">
                  <!-- Username -->
                  <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                    <input 
                      type="text" 
                      id="username" 
                      name="username" 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value=""
                    >
                  </div>
                  
                  <!-- Display Name -->
                  <div>
                    <label for="displayName" class="block text-sm font-medium text-gray-700">Display Name</label>
                    <input 
                      type="text" 
                      id="displayName" 
                      name="displayName" 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value=""
                    >
                  </div>
                  
                  <!-- Email -->
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value=""
                    >
                  </div>
                  
                  <!-- Change Password Section -->
                  <div class="pt-4 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                    
                    <!-- Current Password -->
                    <div class="mb-4">
                      <label for="currentPassword" class="block text-sm font-medium text-gray-700">Current Password</label>
                      <input 
                        type="password" 
                        id="currentPassword" 
                        name="currentPassword" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      >
                    </div>
                    
                    <!-- New Password -->
                    <div class="mb-4">
                      <label for="newPassword" class="block text-sm font-medium text-gray-700">New Password</label>
                      <input 
                        type="password" 
                        id="newPassword" 
                        name="newPassword" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      >
                    </div>
                    
                    <!-- Confirm New Password -->
                    <div>
                      <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
                      <input 
                        type="password" 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      >
                    </div>
                  </div>
                  
                  <!-- Form Buttons -->
                  <div class="flex justify-end space-x-4 pt-4">
                    <button 
                      type="button" 
                      id="cancel-button" 
                      class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
                
                <!-- Notification Section -->
                <div id="notification" class="mt-6 hidden">
                  <div class="p-4 rounded-md bg-green-50">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p id="notification-message" class="text-sm font-medium text-green-800">Profile updated successfully!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Cache the element
    this.element = container;
    
    // Attach event listeners
    this.setupEventHandlers();
    
    // Fetch profile data separately (non-blocking)
    setTimeout(() => {
      this.fetchProfileData().then(() => {
        this.updateUIWithProfileData();
      });
    }, 0);
    
    return container;
  }
  
  async update(): Promise<void> {
    // Refresh profile data when the page is revisited
    if (this.element) {
      await this.fetchProfileData();
      this.updateUIWithProfileData();
    }
  }
  
  private async fetchProfileData(): Promise<void> {
    try {
      const profileData = await this.userService.getProfile();
      
      if (profileData.success) {
        this.userProfile = profileData;
        console.log('User profile data:', this.userProfile);
      } else {
        console.error('Failed to fetch profile:', profileData.error);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }
  
  private updateUIWithProfileData(): void {
    if (!this.element || !this.userProfile) return;
    
    // Update avatar
    const avatarImg = this.element.querySelector('#current-avatar') as HTMLImageElement;
    if (avatarImg) {
      const defaultAvatarPath = '/uploads/avatars/default-avatar.png';
      const avatarPath = this.userProfile?.profileData?.avatarPath;
      
      // Set a flag to prevent infinite loop during error handling
      let handlingError = false;
      
      avatarImg.onerror = () => {
        if (!handlingError) {
          handlingError = true;
          console.error('Failed to load profile image');
          avatarImg.src = defaultAvatarPath;
        }
      };
      
      // Set the source with cache-busting only if we have a custom avatar
      if (avatarPath) {
        avatarImg.src = `${avatarPath}?t=${new Date().getTime()}`;
      } else {
        avatarImg.src = defaultAvatarPath;
      }
    }
    
    // Update form fields
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
  }
 
  private setupEventHandlers(): void {
    if (!this.element) return;
    
    // Avatar upload
    const avatarUpload = this.element.querySelector('#avatar-upload') as HTMLInputElement;
    if (avatarUpload) {
      avatarUpload.addEventListener('change', e => this.handleAvatarUpload(e));
    }
    
    // Form submission
    const profileForm = this.element.querySelector('#profile-form') as HTMLFormElement;
    if (profileForm) {
      profileForm.addEventListener('submit', e => this.handleFormSubmit(e));
    }
    
    // Cancel button
    const cancelButton = this.element.querySelector('#cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.router.navigateTo('/home');
      });
    }
  }
  
  private async handleAvatarUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    
    // Check if files were selected
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      this.showNotification('Please select a valid image file (JPG, PNG, or GIF)', 'error');
      return;
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      this.showNotification('Image size must be less than 5MB', 'error');
      return;
    }
    
    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Display loading state (optional)
      const avatarContainer = this.element?.querySelector('.avatar-container');
      if (avatarContainer) {
        avatarContainer.classList.add('opacity-50');
      }
      
      // Send the file to the server
      const result = await this.userService.uploadAvatar(formData);
      
      if (result.success) {
        // Update the profile image
        const avatarImg = this.element?.querySelector('#current-avatar') as HTMLImageElement;
        if (avatarImg) {
          // Add cache-busting query parameter to force browser to load the new image
          avatarImg.src = `${result.avatarPath}?t=${new Date().getTime()}`;
        }
        
        this.showNotification('Profile picture updated successfully', 'success');
      } else {
        this.showNotification(`Failed to upload image: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      this.showNotification('Failed to upload profile picture', 'error');
    } finally {
      // Remove loading state
      const avatarContainer = this.element?.querySelector('.avatar-container');
      if (avatarContainer) {
        avatarContainer.classList.remove('opacity-50');
      }
      
      // Reset the file input
      input.value = '';
    }
  }
  
  private async handleFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
    if (!this.element) return;
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Basic validation
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    if (newPassword && newPassword !== confirmPassword) {
      this.showNotification('New passwords do not match', 'error');
      return;
    }
    
    // Prepare user data update
    const userDataUpdate = {
      username: (formData.get('username') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
    };
    
    // Prepare profile data update
    const profileDataUpdate = {
      displayName: (formData.get('displayName') as string) || undefined,
    };
    
    // Prepare password update data if provided
    const passwordData = newPassword ? {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: newPassword,
    } : null;
    
    try {      
      let hasError = false;
      
      // Update user data
      if (Object.keys(userDataUpdate).length > 0) {
        const userResult = await this.userService.updateUserData(userDataUpdate);
        if (!userResult.success) {
          this.showNotification(`User data update failed: ${userResult.error}`, 'error');
          hasError = true;
        }
      }
      
      // Update profile data
      if (!hasError && Object.keys(profileDataUpdate).length > 0) {
        const profileResult = await this.userService.updateProfileData(profileDataUpdate);
        if (!profileResult.success) {
          this.showNotification(`Profile data update failed: ${profileResult.error}`, 'error');
          hasError = true;
        }
      }
      
      // Update password if provided
      if (!hasError && passwordData) {
        const passwordResult = await this.userService.updatePassword(passwordData);
        if (!passwordResult.success) {
          // Display specific password error message from the server
          const errorMessage = passwordResult.error || 'Password update failed';
          this.showNotification(errorMessage, 'error');
          hasError = true;
          
          // Clear password fields on error
          const newPasswordField = this.element.querySelector('#newPassword') as HTMLInputElement;
          const confirmPasswordField = this.element.querySelector('#confirmPassword') as HTMLInputElement;
          const currentPasswordField = this.element.querySelector('#currentPassword') as HTMLInputElement;
          
          if (newPasswordField) newPasswordField.value = '';
          if (confirmPasswordField) confirmPasswordField.value = '';
          if (currentPasswordField) currentPasswordField.value = '';
          
          // Focus back on current password field
          if (currentPasswordField) currentPasswordField.focus();
        }
      }
      
      // Only show success notification if no errors occurred
      if (!hasError) {
        this.showNotification('Profile updated successfully', 'success');
        
        // Refresh the profile data
        await this.fetchProfileData();
        this.updateUIWithProfileData(); // Update UI with refreshed data
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showNotification('Failed to update profile', 'error');
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error'): void {
    if (!this.element) return;
    
    const notification = this.element.querySelector('#notification');
    const notificationMessage = this.element.querySelector('#notification-message');
    
    if (notification && notificationMessage) {
      // Set message
      notificationMessage.textContent = message;
      
      // Set color based on type
      if (type === 'error') {
        notification.classList.remove('bg-green-50');
        notification.classList.add('bg-red-50');
        notificationMessage.classList.remove('text-green-800');
        notificationMessage.classList.add('text-red-800');
        
        // Get the SVG icon and change it to an error icon for errors
        const iconContainer = notification.querySelector('.flex-shrink-0');
        if (iconContainer) {
          iconContainer.innerHTML = `
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          `;
        }
      } else {
        notification.classList.remove('bg-red-50');
        notification.classList.add('bg-green-50');
        notificationMessage.classList.remove('text-red-800');
        notificationMessage.classList.add('text-green-800');
        
        // Set success icon
        const iconContainer = notification.querySelector('.flex-shrink-0');
        if (iconContainer) {
          iconContainer.innerHTML = `
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          `;
        }
      }
      
      // Show notification
      notification.classList.remove('hidden');
      
      // Auto-hide after 5 seconds for success, 8 seconds for errors
      setTimeout(() => {
        notification.classList.add('hidden');
      }, type === 'error' ? 8000 : 5000);
    }
  }
}