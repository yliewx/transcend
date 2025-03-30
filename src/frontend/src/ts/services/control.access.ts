import { AuthService } from './auth.service';
import { UserService } from './user.service';

export class ControlAccess {
  private isAuthenticated: boolean = false;
  private authStateChangeListeners: ((isAuthenticated: boolean) => void)[] = [];
  private accessTokenExpiry: Date | null = null;
  private refreshTokenExpiry: Date | null = null;
  
  constructor(private authService: AuthService) {
    this.checkAuthStatus();
  }

  /* valid access: proceed to handleRoute
  invalid access + invalid refresh: redirect to login
  invalid access + valid refresh: refresh access token -> redirect to login on failure */
  public async checkAuthStatus(): Promise<boolean> {
    console.log('[ControlAccess] Checking authentication status...', this.accessTokenExpiry, this.refreshTokenExpiry);
    // Update expiry time of existing tokens
    await this.checkTokenStatus();

    // If access token hasn't expired: no need to check refresh token
    if (!this.isExpiredToken('access')) {
      console.log('[ControlAccess] Access token is valid.');
      this.setAuthenticated(true);
      return this.isAuthenticated;
    }

    console.log('[ControlAccess] Access token expired or invalid.');

    // If access token has expired: check refresh token
    if (!this.isExpiredToken('refresh')) {
      // Refresh access token if valid refresh token exists
      console.log('[ControlAccess] Attempting token refresh...');
      const result = await this.handleTokenRefresh();
      
      if (!result.success) {
        console.log('[ControlAccess] Failed to refresh access token.', result.message);
        this.setAuthenticated(false);
      } else {
        console.log('[ControlAccess] Successfully refreshed access token.');
        this.setAuthenticated(true);
      }
    } else {
      console.log('[ControlAccess] Refresh token expired or invalid.');
      this.setAuthenticated(false);
    }
    return this.isAuthenticated;
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
      console.log(`[ControlAccess] Setting authentication status to: ${status}`);
      this.isAuthenticated = status;
      this.notifyListeners();
    }
  }

  /**
   * Check and update expiry time of JWT token in HTTP-only cookie
   */
  private async checkTokenStatus(): Promise<void> {
    try {
      // Get status of access token and refresh token
      const result = await this.authService.checkTokenStatus();

      if (!result.success) {
        throw new Error('Failed to fetch auth token status');
      }
      if (!result.status) {
        throw new Error('Token status is missing in response');
      }

      // Set token expiry
      this.accessTokenExpiry = result.status.accessTokenExpiry ? new Date(result.status.accessTokenExpiry) : null;
      this.refreshTokenExpiry = result.status.refreshTokenExpiry ? new Date(result.status.refreshTokenExpiry) : null;
    } catch (error) {
      console.error("Error checking authentication:", error);
    }
  }
  
  /**
   * Check if token has expired
   */
  private isExpiredToken(token_type: 'access' | 'refresh'): boolean {
    const expiry = token_type === 'access' ? this.accessTokenExpiry : this.refreshTokenExpiry;
    const now = new Date();
    
    if (expiry) {
      if (expiry < now) {
        console.log(`Token: ${token_type} has expired.`);
        return true;
      } else {
        console.log(`Token: ${token_type} is valid. Expires at: ${expiry}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Attempts to request access token if valid refresh token exists (bypass OTP verification)
   */
  public async handleTokenRefresh(): Promise<{ success: boolean, message?: string }> {
    // Check if refresh token has expired
    if (this.isExpiredToken('refresh')) {
      this.setAuthenticated(false);
      return { success: false, message: 'Refresh token expired' };
    }

    try {
      const result = await this.authService.refreshAccessToken();
      
      if (!result.success) {
        return { success: false, message: 'Refresh token invalid or expired' };
      }
      
      if (result.accessTokenExpiry) {
        this.accessTokenExpiry = new Date(result.accessTokenExpiry);
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