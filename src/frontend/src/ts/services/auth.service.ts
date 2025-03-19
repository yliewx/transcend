import { BaseApiService } from "./base.api";

// Derived class for handling authentication-related requests
export class AuthService extends BaseApiService {

  /*--------------------------------REGISTER--------------------------------*/

  public async register(
    username: string, 
    email: string, 
    password: string
  ): Promise<{success: boolean, message?: string, error?: string}> {
    return this.request<{message?: string, error?: string}>(
      '/register', 
      'POST', 
      { username, email, password }
    );
  }

  /*---------------------------------LOGIN----------------------------------*/

  // TO-DO: CHANGE TO PRE-AUTH TOKEN
  public async login(
    username: string, 
    password: string
  ): Promise<{success: boolean, message?: string, error?: string, user?: any}> {
    const response = await this.request<{
      success: boolean, message?: string, preAuthToken?: string, user: any
    }>(
      '/login', 
      'POST', 
      { username, password }
    );
    
    // Store the token in localStorage if login was successful
    if (response.success && response.preAuthToken) {
      localStorage.setItem('preAuthToken', response.preAuthToken);
    } else if (response.success && !response.preAuthToken) {
      console.error('No pre-authentication token received from server');
      return {
        success: false,
        error: 'Pre-authentication token missing from response'
      };
    }
      // // Set JWT token in local storage if exists in response
      // if (response.token) {
      //   localStorage.setItem('jwt', response.token);
      //   return {
      //     success: true,
      //     message: response.message || 'Login successful'
      //   };
      // } else {
      //   throw new Error('Authentication token missing from response');
      // }

    return response;
  }

  /*---------------------------------LOGOUT---------------------------------*/

  public async logout(): Promise<{success: boolean, message?: string, error?: string}> {
    const response = await this.request<{message?: string, error?: string}>(
      '/logout', 
      'POST',
      undefined,
      true,
      false,
      { omitContentType: true}
    );
    
    // If logout was successful, clear JWT token from storage
    if (response.success) {
      localStorage.removeItem('jwt');
      sessionStorage.removeItem('jwt');
    }
    
    return response;
  }

  /*-----------------------------2FA PREFERENCES----------------------------*/

  public async update2FAMethod(
    id: number,
    method: string
  ): Promise<{ success: boolean; message?: string }> {
      const response = await this.request<{ message: string }>(
        '/otp/preferences',
        'POST',
        { id, method },
        false,
        true
      );
      
      return response;
  }

  /*-------------------------------VERIFY OTP-------------------------------*/

  public async verifyOtp(
    id: number,
    otp: string
  ): Promise<{ success: boolean; message?: string }> {
    const data = await this.request<{ token: string, message: string }>(
      '/otp/verify',
      'POST',
      { id, otp },
      false,
      true
    )

    // Set JWT token in local storage if exists in response
    if (data.token) {
      localStorage.setItem('jwt', data.token);
      return {
        success: true,
        message: data.message || 'Login successful'
      };
    } else {
      throw new Error('Authentication token missing from response');
    }
  }
}
