export class ApiService {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Core request method for all API calls
   */
  private async request<T>(
    endpoint: string, 
    method: string, 
    data?: any, 
    requiresAuth = false,
    options: { omitContentType?: boolean, includeCookies?: boolean } = {}
  ): Promise<{success: boolean, error?: string} & T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {};
      
      // Add Content-Type header unless explicitly omitted
      if (!options.omitContentType) {
        headers['Content-Type'] = 'application/json';
      }
      
      // Add auth token if required
      if (requiresAuth) {
        const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
        if (!token) {
          return {
            success: false,
            error: 'Not authenticated'
          } as {success: boolean, error?: string} & T;
        }
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Build request options
      const requestOptions: RequestInit = { method, headers };    
      
      // Add body for non-GET requests if data is provided
      if (method !== 'GET' && data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      // Make the request
      console.log(`${method} request to ${url}`);
      const response = await fetch(url, requestOptions);
      console.log(`Response status: ${response.status}`);
      
      // Parse response
      const responseData = await response.json();
      
      // Handle unsuccessful responses
      if (!response.ok) {
        console.error(`API error: ${responseData.error || response.statusText}`);
        return { 
          success: false, 
          error: responseData.error || `Request failed (Status: ${response.status})` 
        } as {success: boolean, error?: string} & T;
      }

      // Return successful response
      return { 
        success: true,
        ...responseData
      } as {success: boolean} & T;
    } catch (error) {
      console.error('Exception during request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Request failed' 
      } as {success: boolean, error?: string} & T;
    }
  }
  
  /**
   * Register a new user
   */
  public async register(
    username: string, 
    email: string, 
    password: string
  ): Promise<{success: boolean, message?: string, error?: string}> {
    return this.request<{message?: string, error?: string}>(
      '/api/register', 
      'POST', 
      { username, email, password }
    );
  }
  
  /**
   * Log in a user
   */
  public async login(
    username: string, 
    password: string
  ): Promise<{success: boolean, message?: string, error?: string}> {
    const response = await this.request<{message?: string, error?: string, token?: string}>(
      '/login', 
      'POST', 
      { username, password }
    );
    
    // Store the token in localStorage if login was successful
    if (response.success && response.token) {
      localStorage.setItem('jwt', response.token);
    } else if (response.success && !response.token) {
      console.error('No token received from server');
      return {
        success: false,
        error: 'Authentication token missing from response'
      };
    }
    
    return response;
  }
  
  /**
   * Log out a user
   */
  public async logout(): Promise<{success: boolean, message?: string, error?: string}> {
    const response = await this.request<{message?: string, error?: string}>(
      '/logout', 
      'POST',
      undefined,
      true,
      { omitContentType: true}
    );
    
    // If logout was successful, clear JWT token from storage
    if (response.success) {
      localStorage.removeItem('jwt');
      sessionStorage.removeItem('jwt');
    }
    
    return response;
  }
  
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
}