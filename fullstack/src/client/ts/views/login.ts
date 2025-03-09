import { Router } from '../router';

export class LoginView {
  private container: HTMLElement;
  private router: Router;
  
  constructor(container: HTMLElement, router: Router) {
    this.container = container;
    this.router = router;
  }
  
   // <p class="mt-2 text-sm text-gray-600">
                //   Or <a href="/register" class="nav-link font-medium text-indigo-600 hover:text-indigo-500">create a new account</a>
                // </p>
  public render(): void {
    this.container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-900">Log in to your account</h1>
               
              </div>
              
              <form id="login-form" class="mt-8 space-y-6">
                <div id="login-message" class="rounded-md bg-blue-50 p-4">
                  <div class="flex">
                    <div class="ml-3">
                      <h1 class="text-2xl font-bold text-blue-800 text-center">Welcome to transcendence!</h1>                    
                    </div>
                  </div>
                </div>
                
                <div class="rounded-md shadow-sm space-y-4">
                  <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                    <input id="username" name="username" type="text" 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  </div>
                  
                  <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input id="password" name="password" type="password" 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  </div>
                </div>
                
                <div>
                  <button type="button" 
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Log in
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;
  }
}
