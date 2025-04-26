import { BaseApiService } from "./base.api";

// Derived class for handling authentication-related requests
export class UserService extends BaseApiService {
    /**
   * Get the current user's profile information
   */
  public async getProfile(): Promise<{success: boolean, userData?: any, profileData?: any, error?: string}> {
    const response = await this.request<{user?: any, profile?: any, error?: string}>(
      '/profile', 
      'GET', 
      undefined, 
      true
    );
    
    if (response.success) {
      return {
        success: true,
        userData: response.user,
        profileData: response.profile
      };
    }
    
    return response as any;
  }
    
  /**
   * Update profile data (display name, etc.)
   */
  public async updateProfileData(
    profileData: { displayName?: string }
  ): Promise<{success: boolean, profileData?: any, error?: string}> {
    const response = await this.request<{profile?: any, error?: string}>(
      '/profile/update', 
      'PUT', 
      profileData, 
      true
    );
    
    if (response.success) {
      return {
        success: true,
        profileData: response.profile
      };
    }
    
    return response as any; 
  }
  
  /**
   * Update user data (username, email)
   */
  public async updateUserData(
    userData: { username?: string, email?: string }
  ): Promise<{success: boolean, userData?: any, error?: string}> {
    const response = await this.request<{user?: any, error?: string}>(
      '/user/update', 
      'PUT', 
      userData, 
      true
    );
    
    if (response.success) {
      return {
        success: true,
        userData: response.user
      };
    }
    
    return response as any;
  }
  
  /**
   * Update user password
   */
  public async updatePassword(
    passwordData: { currentPassword: string, newPassword: string }
  ): Promise<{success: boolean, message?: string, error?: string}> {
    return this.request<{message?: string, error?: string}>(
      '/user/password', 
      'PUT', 
      passwordData, 
      true
    );
  }


  // async uploadAvatar(formData: FormData): Promise<any> {
  //   try {
  //     const response = await fetch('/api/profile/avatar', {
  //       method: 'POST',
  //       headers: {
  //         // Don't set Content-Type when using FormData
  //         // It will be set automatically with the correct boundary
  //         credentials: 'include',
  //       },
  //       body: formData
  //     });
      
  //     const result = await response.json();
      
  //     if (!response.ok) {
  //       return {
  //         success: false,
  //         error: result.error || 'Failed to upload avatar'
  //       };
  //     }
  //     console.log('Upload response:', result);
  //     return {
  //       success: true,
  //     };
  //   } catch (error) {
  //     console.error('Avatar upload error:', error);
  //     return {
  //       success: false,
  //       error: 'Network error while uploading avatar'
  //     };
  //   }
  // }
  public async uploadAvatar(formData: FormData): Promise<any> {
    return this.request<{}>(
      '/profile/avatar',
      'POST',
      formData,
      true,
      { isFormData: true }
    );
  }
}