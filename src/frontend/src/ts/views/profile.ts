import { Router } from '../router';
import { ApiService } from '../services/api';

export class ProfileView {
  private container: HTMLElement;
  private router: Router;
  private apiService: ApiService;
  private userProfile: any = null;
  
  constructor(container: HTMLElement, router: Router, apiService: ApiService) {
    this.container = container;
    this.router = router;
    this.apiService = apiService;
  }

  public async render(): Promise<void> {
    // Fetch current user profile
    try {
      this.userProfile = await this.apiService.getProfile();
      console.log('User profile data:', this.userProfile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
    
    this.container.innerHTML = `
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
                      src="${this.userProfile?.profileData?.avatarPath || '/assets/default-avatar.png'}" 
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
                      value="${this.userProfile?.userData?.username || ''}"
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
                      value="${this.userProfile?.profileData?.displayName || ''}"
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
                      value="${this.userProfile?.userData?.email || ''}"
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
    
    this.attachEventListeners();
  }
 
  private attachEventListeners(): void {
    // Avatar upload
    const avatarUpload = document.getElementById('avatar-upload') as HTMLInputElement;
    if (avatarUpload) {
      avatarUpload.addEventListener('change', this.handleAvatarUpload.bind(this));
    }
    
    // Form submission
    const profileForm = document.getElementById('profile-form') as HTMLFormElement;
    if (profileForm) {
      profileForm.addEventListener('submit', this.handleFormSubmit.bind(this));
    }
    
    // Cancel button
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.router.navigate('/');
      });
    }
  }
  
  private async handleAvatarUpload(event: Event): Promise<void> {
    //empty for now
  }
  
  private async handleFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    
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
      // Update user data
      if (Object.keys(userDataUpdate).length > 0) {
        await this.apiService.updateUserData(userDataUpdate);
      }
      
      // Update profile data
      if (Object.keys(profileDataUpdate).length > 0) {
        await this.apiService.updateProfileData(profileDataUpdate);
      }
      
      // Update password if provided
      if (passwordData) {
        await this.apiService.updatePassword(passwordData);
      }
      
      this.showNotification('Profile updated successfully', 'success');
      
      // Refresh the profile data
      this.userProfile = await this.apiService.getProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showNotification('Failed to update profile', 'error');
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    if (notification && notificationMessage) {
      // Set message
      notificationMessage.textContent = message;
      
      // Set color based on type
      if (type === 'error') {
        notification.classList.remove('bg-green-50');
        notification.classList.add('bg-red-50');
        notificationMessage.classList.remove('text-green-800');
        notificationMessage.classList.add('text-red-800');
      } else {
        notification.classList.remove('bg-red-50');
        notification.classList.add('bg-green-50');
        notificationMessage.classList.remove('text-red-800');
        notificationMessage.classList.add('text-green-800');
      }
      
      // Show notification
      notification.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        notification.classList.add('hidden');
      }, 5000);
    }
  }
}