export class BaseApiService {
  protected baseUrl: string;
  
  constructor(baseUrl = "https://localhost:8080/api") {
    this.baseUrl = baseUrl;
  }

  /*--------------------------REFRESH ACCESS TOKEN--------------------------*/

  protected async refreshAccessToken(): Promise<{ success: boolean; message?: string }> {
    const response = await this.request<{ success: boolean, message?: string }>(
      '/auth/refresh',
      'POST',
      undefined,
      true,
      { omitContentType: true }
    );
    
    return response;
  }

  /*----------------------------REQUEST HANDLER-----------------------------*/

  protected async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any, 
    requiresAuth: boolean = false,
    options: { omitContentType?: boolean} = {},
    retry: boolean = true // resend request upon failure
  ): Promise<{success: boolean, error?: string} & T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {};
      
      // Add Content-Type header unless explicitly omitted
      if (!options.omitContentType) {
        headers['Content-Type'] = 'application/json';
      }
      
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

      // // Try refreshing access token once if expired
      // if (response.status === 401 && retry) {
      //   console.error('Access token expired. Attempting refresh...');
        
      //   const refreshResult = await this.refreshAccessToken();
      //   if (refreshResult.success) {
      //     console.log('Access token refreshed! Retrying request...');
      //     return this.request<T>(endpoint, method, body, requiresAuth, options, false);
      //   } else {
      //     console.error('Token refresh failed.');
      //     retry = false;
      //     return {
      //       success: false,
      //       error: 'Unauthorized. Please log in again.'
      //     } as { success: boolean; error?: string } & T;
      //   }
      // }

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