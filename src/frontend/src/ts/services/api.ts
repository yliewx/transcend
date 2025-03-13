export class ApiService 
{
    constructor() {}
    
    public async register(username: string, email: string, password: string): Promise<{success: boolean, message?: string, error?: string}> {
      try {
        const response = await fetch('http://localhost:3000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          return { 
            success: false, 
            error: data.error || 'Registration failed' 
          };
        }
        
        return { 
          success: true, 
          message: data.message || 'Registration successful' 
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Registration failed' 
        };
      }
    }

    public async login(username: string, password: string): Promise<{success: boolean, message?: string, error?: string}> {
      try {
        const response = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          return { 
            success: false, 
            error: data.error || 'Login failed' 
          };
        }
        if (data.token) {
          localStorage.setItem('jwt', data.token);
        }
        else {
          console.error('No token received from server');
          return {
            success: false,
            error: 'Authentication token missing from response'
          };
        }
        return { 
          success: true, 
          message: data.message || 'Login successful' 
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Login failed' 
        };
      }
    }

    public async logout(): Promise<{success: boolean, message?: string, error?: string}> {
      try {
        const response = await fetch('http://localhost:3000/logout', {
          method: 'POST',
          //Cant set the Content-Type to application/json, but not send any JSON body.
          credentials: 'include' // Include cookies
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          return { 
            success: false, 
            error: data.error || 'Logout failed' 
          };
        }
        
        return { 
          success: true, 
          message: data.message || 'Logout successful' 
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Logout failed' 
        };
      }
    }


    // Get user profile
    // public async getProfile(): Promise<{success: boolean, userData?: any, profileData?: any, error?: string}> {
    //   try {
    //     const response = await fetch('http://localhost:3000/profile', {
    //       method: 'GET',
    //       headers: {
    //         'Content-Type': 'application/json'
    //       },
    //       credentials: 'include' // Include cookies for authentication
    //     });
        
    //     const data = await response.json();
        
    //     if (!response.ok) {
    //       return { 
    //         success: false, 
    //         error: data.error || 'Failed to load profile' 
    //       };
    //     }
        
    //     return { 
    //       success: true, 
    //       userData: data.user,
    //       profileData: data.profile
    //     };
    //   } catch (error) {
    //     return { 
    //       success: false, 
    //       error: error instanceof Error ? error.message : 'Failed to load profile' 
    //     };
    //   }
    // }
    public async getProfile(): Promise<{success: boolean, userData?: any, profileData?: any, error?: string}> {
      try {
        // Log that we're attempting to fetch the profile
        console.log('Attempting to fetch profile from API');
        
        const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
        if (!token) {
          return {
            success: false,
            error: 'Not authenticated'
          };
        }

        const response = await fetch('http://localhost:3000/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          //credentials: 'include' // Keep this for cookie-based auth
        });
        // Log the response status
        console.log('Profile API response status:', response.status);
        
        // Parse the response data
        const data = await response.json();
        console.log('Profile API response data:', data);
        
        if (!response.ok) {
          console.error('Profile API error:', data);
          return { 
            success: false, 
            error: data.error || `Failed to load profile (Status: ${response.status})` 
          };
        }
        
        return { 
          success: true, 
          userData: data.user,
          profileData: data.profile
        };
      } catch (error) {
        console.error('Exception during profile fetch:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to load profile' 
        };
      }
    }


}
  