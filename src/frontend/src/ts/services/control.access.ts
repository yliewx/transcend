import { AuthService } from './auth.service';
import { UserService } from './user.service';

export class ControlAccess {
  private isAuthenticated: boolean = false;
  private authStateChangeListeners: ((isAuthenticated: boolean) => void)[] = [];
  
  constructor(private authService: AuthService) {
    this.checkAuthentication();
  }
  
  /**
   * Checks if the user is authenticated based on JWT token presence
   */
  /*  private async checkAuthentication(): Promise<void> {
    try {
      // Request access token if valid refresh token exists
      const result = await this.authService.handleTokenRefresh();

      if (result.success) {
        this.setAuthenticated(true);
      } else {
        this.setAuthenticated(false);
      }
    }
    catch (error) {
      console.error('Unable to refresh access token:', error);
      this.setAuthenticated(false);
    }
  }*/
  private checkAuthentication(): void {
    // Check for JWT token in localStorage instead of cookie
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    this.isAuthenticated = !!token;
  }
  
  /**
   * Returns the current authentication status
   */
  public isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
  
  /**
   * Sets the authentication status and notifies listeners
   */
  public setAuthenticated(status: boolean): void {
    if (this.isAuthenticated !== status) {
      this.isAuthenticated = status;
      this.notifyListeners();
    }
  }

  /**
   * Attempts to request access token if valid refresh token exists (bypass OTP verification)
   */
  // public async handleTokenRefresh(): Promise<{ success: boolean, error?: string }> {
  //   try {
  //     const result = await this.authService.handleTokenRefresh();

  //     if (result.success) {
  //       this.setAuthenticated(true);
  //     } else {
  //       this.setAuthenticated(false);
  //     }
  //     return result;
  //   }
  //   catch (error) {
  //     this.setAuthenticated(false);
  //     return { success: false, error: 'Unable to refresh access token: ' + error };
  //   }
  // }
  async handleTokenRefresh(): Promise<{ success: boolean, message?: string }> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include cookies if using cookie-based refresh tokens
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // If we get a 401, immediately return failure without trying to parse the response
      if (response.status === 401) {
        return { success: false, message: 'Refresh token invalid or expired' };
      }
      
      if (!response.ok) {
        return { success: false, message: `Server error: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (data.token) {
        // localStorage.setItem('jwt', data.token);
        return { success: true };
      } else {
        return { success: false, message: 'No token in response' };
      }
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }
  
  /**
   * Attempts to log in the user with provided credentials
   */
  public async login(username: string, password: string): Promise<{ success: boolean, error?: string, user?: any }> {
    try {
      const result = await this.authService.login(username, password);
      
      return result;
    } catch (error) {
      return { success: false, error: 'Login failed: ' + error };
    }
  }
  
  /**
   * Attempts to log in the user with provided credentials
   */
  public async verifyOtp(otp: string): Promise<{ success: boolean, error?: string, user?: any }> {
    try {
      const result = await this.authService.verifyOtp(otp);
      
      if (result.success) {
        this.setAuthenticated(true);
      }
      else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Two-factor authentication failed: ' + error };
    }
  }

  /**
   * Logs out the current user
   */
  public async logout(): Promise<{ success: boolean, error?: string }> {
    try {
      const result = await this.authService.logout();
      
      if (result.success) {
        this.setAuthenticated(false);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Logout failed: ' + error };
    }
  }
  
  /**
   * Register for authentication state changes
   */
  public addAuthStateChangeListener(listener: (isAuthenticated: boolean) => void): void {
    this.authStateChangeListeners.push(listener);
  }
  
  /**
   * Remove an authentication state change listener
   */
  public removeAuthStateChangeListener(listener: (isAuthenticated: boolean) => void): void {
    const index = this.authStateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.authStateChangeListeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of an authentication state change
   */
  private notifyListeners(): void {
    for (const listener of this.authStateChangeListeners) {
      listener(this.isAuthenticated);
    }
  }
  
  /**
   * Get the API service instance
   * This method provides access to the API service for components
   */
  public getAuthService(): AuthService {
    return this.authService;
  }
}