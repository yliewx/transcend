export class BaseApiService {
  protected baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.BASE_API_URL as string;
  }

  /*----------------------------REQUEST HANDLER-----------------------------*/

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
      
      if (!options.omitContentType && !options.isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      let requestBody;
      if (options.isFormData) {
        requestBody = body;
      } else {
        requestBody = body ? JSON.stringify(body) : undefined;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        credentials: requiresAuth ? 'include' : undefined,
      });
    
      if (response.status === 304) {
        return { success: true } as {success: boolean} & T;
      }
  
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error(`API error: ${responseData.error || response.statusText}`);
        return { 
          success: false, 
          error: responseData.error || `Request failed (Status: ${response.status})` 
        } as {success: boolean, error?: string} & T;
      }
  
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