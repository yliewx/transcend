import { BaseApiService } from "./base.api";

export class UserService extends BaseApiService {
  public async getProfile(): Promise<{success: boolean, userData?: any, profileData?: any, error?: string}> {
    const response = await this.request<{userData?: any, profileData?: any, error?: string}>(
      '/profile', 
      'GET', 
      undefined, 
      true
    );
    
    if (response.success) {
      return {
        success: true,
        userData: response.userData,
        profileData: response.profileData
      };
    }
    
    return response as any;
  }
    
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