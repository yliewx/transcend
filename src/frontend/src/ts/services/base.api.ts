export class BaseApiService {
  protected baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.BASE_API_URL as string;
  }

  /*----------------------------REQUEST HANDLER-----------------------------*/

  // protected async request<T>(
  //   endpoint: string, 
  //   method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  //   body?: any, 
  //   requiresAuth: boolean = false,
  //   options: { omitContentType?: boolean} = {}
  // ): Promise<{success: boolean, error?: string} & T> {
  //   try {
  //     const url = `${this.baseUrl}${endpoint}`;
  //     const headers: Record<string, string> = {};
      
  //     // Add Content-Type header unless explicitly omitted
  //     if (!options.omitContentType) {
  //       headers['Content-Type'] = 'application/json';
  //     }
      
  //     // Make the request
  //     console.log(`${method} request to ${url}`);
  //     // Get response from server
  //     const response = await fetch(url, {
  //       method,
  //       headers,
  //       body: body ? JSON.stringify(body) : undefined,
  //       credentials: requiresAuth ? 'include' : undefined,
  //     });

  //     console.log(`Response status: ${response.status}`);

  //     // Handle 304 Not Modified specially
  //     if (response.status === 304) {
  //       return { success: true } as {success: boolean} & T;
  //     }

  //     // Parse response
  //     const responseData = await response.json();
      
  //     // Handle unsuccessful responses
  //     if (!response.ok) {
  //       console.error(`API error: ${responseData.error || response.statusText}`);
  //       return { 
  //         success: false, 
  //         error: responseData.error || `Request failed (Status: ${response.status})` 
  //       } as {success: boolean, error?: string} & T;
  //     }

  //     // Return successful response
  //     return { 
  //       success: true,
  //       ...responseData
  //     } as {success: boolean} & T;
  //   } catch (error) {
  //     console.error('Exception during request:', error);
  //     return { 
  //       success: false, 
  //       error: error instanceof Error ? error.message : 'Request failed' 
  //     } as {success: boolean, error?: string} & T;
  //   }
  // }


  protected async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any, 
    requiresAuth: boolean = false,
    options: { 
      omitContentType?: boolean,
      isFormData?: boolean
    } = {}
  ): Promise<{success: boolean, error?: string} & T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {};
      
      // Add Content-Type header unless it's FormData or explicitly omitted
      if (!options.omitContentType && !options.isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      // Prepare the request body based on whether it's FormData or JSON
      let requestBody;
      if (options.isFormData) {
        // If it's FormData, pass it directly
        requestBody = body;
      } else {
        // Otherwise, stringify it for JSON requests
        requestBody = body ? JSON.stringify(body) : undefined;
      }
      
      // Make the request
      console.log(`${method} request to ${url}`);
      
      // Get response from server
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        credentials: requiresAuth ? 'include' : undefined,
      });
  
      console.log(`Response status: ${response.status}`);
  
      // Handle 304 Not Modified specially
      if (response.status === 304) {
        return { success: true } as {success: boolean} & T;
      }
  
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