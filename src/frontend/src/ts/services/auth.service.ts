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

  public async login(
    username: string, 
    password: string
  ): Promise<{success: boolean, message?: string, error?: string, user?: any}> {
    const response = await this.request<{
      success: boolean, message?: string, user: any
    }>(
      '/login', 
      'POST', 
      { username, password }
    );

    return response;
  }

  /*-----------------------------2FA PREFERENCES----------------------------*/

  public async update2FAMethod(
    otp_option: string,
    otp_contact?: string | null
  ): Promise<{ success: boolean; message?: string }> {
      const response = await this.request<{ success: boolean; message?: string }>(
        '/otp/preferences',
        'POST',
        { otp_option, otp_contact },
        true
      );
      
      return {
        success: response.success,
        message: response.message || undefined
      };
  }

  /*-------------------------------GENERATE OTP-------------------------------*/

  public async generateOtp(): Promise<{ success: boolean; message?: string }> {
    const response = await this.request<{ success: boolean; message?: string; user?: any }>(
      '/otp/generate',
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );

    return {
      success: response.success,
      message: response.message || undefined
    };
  }

  public async generateQRCode(): Promise<{ success: boolean; qrCode?: string; secret: string | null }> {
    const response = await this.request<{ success: boolean; qrCode?: string; secret: string | null }>(
      '/otp/qrcode',
      'GET',
      undefined,
      true,
      { omitContentType: true}
    );

    return response;
  }

  /*-------------------------------VERIFY OTP-------------------------------*/

  public async verifyOtp(otp: string): Promise<{ success: boolean; message?: string }> {
    const response = await this.request<{ token: string, message?: string }>(
      '/otp/verify',
      'POST',
      { otp },
      true
    );
    
    return response;
  }

  /*--------------------------REFRESH ACCESS TOKEN--------------------------*/

  public async handleTokenRefresh(): Promise<{ success: boolean; message?: string }> {
    return this.refreshAccessToken();
  }

  /*---------------------------------LOGOUT---------------------------------*/

  public async logout(): Promise<{success: boolean, message?: string, error?: string}> {
    const response = await this.request<{message?: string, error?: string}>(
      '/logout', 
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );
    
    return response;
  }
}
