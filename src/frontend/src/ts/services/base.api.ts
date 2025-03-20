export class BaseApiService {
  protected baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  protected async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any, 
    requiresAuth: boolean = false,
    options: { omitContentType?: boolean} = {}
  ): Promise<{success: boolean, error?: string} & T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {};
      
      // Add Content-Type header unless explicitly omitted
      if (!options.omitContentType) {
        headers['Content-Type'] = 'application/json';
      }
      
      // // Add auth token if required
      // if (requiresAuth) {
      //   const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      //   if (!token) {
      //     return {
      //       success: false,
      //       error: 'No authentication token'
      //     } as {success: boolean, error?: string} & T;
      //   }
      //   headers['Authorization'] = `Bearer ${token}`;
      // }

      // // Add pre-auth token if required
      // if (requiresPreAuth) {
      //   const token = localStorage.getItem('preAuthToken') || sessionStorage.getItem('preAuthToken');
      //   if (!token) {
      //     return {
      //       success: false,
      //       error: 'No pre-authentication token'
      //     } as {success: boolean, error?: string} & T;
      //   }
      //   headers['Pre-Auth-Token'] = token;
      // }
      
      // Make the request
      console.log(`${method} request to ${url}`);
      // Get response from server
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: requiresAuth ? 'include' : undefined,
      });

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
}