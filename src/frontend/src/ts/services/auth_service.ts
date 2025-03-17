// services/auth.service.ts
import { ApiService } from './api';

export class AuthService {
  private isAuthenticated: boolean = false;
  private authStateChangeListeners: ((isAuthenticated: boolean) => void)[] = [];
  
  constructor(private apiService: ApiService) {
    this.checkAuthentication();
  }
  
  /**
   * Checks if the user is authenticated based on JWT token presence
   */
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
   * Attempts to log in the user with provided credentials
   */
  public async login(username: string, password: string): Promise<{ success: boolean, error?: string }> {
    try {
      const result = await this.apiService.login(username, password);
      
      if (result.success) {
        this.setAuthenticated(true);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: 'Login failed: ' + error };
    }
  }
  
  /**
   * Logs out the current user
   */
  public async logout(): Promise<{ success: boolean, error?: string }> {
    try {
      const result = await this.apiService.logout();
      
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
  public getApiService(): ApiService {
    return this.apiService;
  }
}