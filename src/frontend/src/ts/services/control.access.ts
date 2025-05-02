import { AuthService } from './auth.service';

export class ControlAccess {
  private isAuthenticated: boolean = false;
  private authStateChangeListeners: ((isAuthenticated: boolean) => void)[] = [];
  private accessTokenExpiry: Date | null = null;
  private refreshTokenExpiry: Date | null = null;
  private googleClientId: string | null = process.env.GOOGLE_CLIENT_ID ?? null;
  private authCheckTimeoutId: number | null = null;
  
  constructor(private authService: AuthService) {}

  public startAuthCheckLoop(): void {
    if (this.authCheckTimeoutId !== null) {
      return;
    }
    this.scheduleNextAuthCheck();
  }

  public stopAuthCheckLoop(): void {
    if (this.authCheckTimeoutId !== null) {
      clearTimeout(this.authCheckTimeoutId);
      this.authCheckTimeoutId = null;
    }
  }

  private scheduleNextAuthCheck(): void {
    if (this.authCheckTimeoutId !== null) {
      clearTimeout(this.authCheckTimeoutId);
      this.authCheckTimeoutId = null;
    }

    const now = new Date();
    let delayMs = 60_000;

    if (this.accessTokenExpiry) {
      const timeUntilExpiry = this.accessTokenExpiry.getTime() - now.getTime();

      if (timeUntilExpiry > 0) {
        delayMs = Math.max(Math.floor(timeUntilExpiry / 2), 5_000);
      } else {
        delayMs = 5_000;
      }
    }

    this.authCheckTimeoutId = window.setTimeout(async () => {
      try {
        await this.checkAuthStatus();
      } catch (error) {
        console.error('[ControlAccess] Error during periodic auth check:', error);
      } finally {
        this.scheduleNextAuthCheck();
      }
    }, delayMs);
  }

  public async checkAuthStatus(): Promise<boolean> {
    await this.checkTokenStatus();

    if (!this.isExpiredToken('access')) {
      this.setAuthenticated(true);
      return this.isAuthenticated;
    }

    if (!this.isExpiredToken('refresh')) {
      const result = await this.handleTokenRefresh();
      
      if (!result.success) {
        console.warn('[ControlAccess] Failed to refresh access token.');
        this.setAuthenticated(false);
      } else {
        this.setAuthenticated(true);
      }
    } else {
      console.warn('[ControlAccess] Refresh token expired or invalid.');
      this.setAuthenticated(false);
    }
    return this.isAuthenticated;
  }

  public isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
  
  public setAuthenticated(status: boolean): void {
    if (this.isAuthenticated !== status) {
      this.isAuthenticated = status;
      this.notifyListeners();
  
      if (status) {
        this.startAuthCheckLoop();
      } else {
        this.stopAuthCheckLoop();
      }
    }
  }  

  private async checkTokenStatus(): Promise<void> {
    try {
      const result = await this.authService.checkTokenStatus();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch auth token status');
      }
      if (!result.status) {
        throw new Error('Token status is missing in response');
      }

      sessionStorage.setItem('userId', String(result.status.userId));
      this.accessTokenExpiry = result.status.accessTokenExpiry ? new Date(result.status.accessTokenExpiry) : null;
      this.refreshTokenExpiry = result.status.refreshTokenExpiry ? new Date(result.status.refreshTokenExpiry) : null;
    } catch (error) {
      console.error("Error checking authentication:", error);
      this.setAuthenticated(false);
    }
  }
  
  private isExpiredToken(token_type: 'access' | 'refresh'): boolean {
    const expiry = token_type === 'access' ? this.accessTokenExpiry : this.refreshTokenExpiry;
    const now = new Date();
    
    if (expiry) {
      if (expiry < now) {
        return true;
      } else {
        return false;
      }
    }
    return true;
  }

  private async handleTokenRefresh(): Promise<{ success: boolean, message?: string }> {
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
  
  public async login(username: string, password: string): Promise<{ success: boolean, error?: string, user?: any }> {
    try {
      const result = await this.authService.login(username, password);
      
      return result;
    } catch (error) {
      return { success: false, error: 'Login failed: ' + error };
    }
  }

  public async loginWithGoogle(idToken: string): Promise<{ success: boolean, message?: string, error?: string, user?: any }> {
    try {
      const result = await this.authService.loginWithGoogle(idToken);

      if (result.success) {
        this.setAuthenticated(true);
      }
      else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Google sign-in failed: ' + error };
    }
  }
  
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
  
  public addAuthStateChangeListener(listener: (isAuthenticated: boolean) => void): void {
    this.authStateChangeListeners.push(listener);
  }
  
  public removeAuthStateChangeListener(listener: (isAuthenticated: boolean) => void): void {
    const index = this.authStateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.authStateChangeListeners.splice(index, 1);
    }
  }
  
  private notifyListeners(): void {
    for (const listener of this.authStateChangeListeners) {
      listener(this.isAuthenticated);
    }
  }
  
  public getAuthService(): AuthService {
    return this.authService;
  }

  public getGoogleClientId(): string | null {
    return this.googleClientId;
  }
}