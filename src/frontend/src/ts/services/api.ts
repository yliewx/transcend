export class ApiService {
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
  }
  