/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/client/ts/router.ts":
/*!*********************************!*\
  !*** ./src/client/ts/router.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Router: () => (/* binding */ Router)
/* harmony export */ });
class Router {
    constructor(options) {
        this.handlers = {};
        this.currentRoute = '';
        this.appContainer = options.appContainer;
        this.routes = options.routes;
        this.notFoundRoute = options.notFoundRoute;
    }
    init() {
        // Handle initial load
        this.handleLocationChange();
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleLocationChange();
        });
        // Intercept link clicks for client-side navigation
        document.addEventListener('click', (e) => {
            const target = e.target;
            const link = target.closest('a.nav-link');
            if (link && link.href) {
                e.preventDefault();
                const url = new URL(link.href);
                const pathname = url.pathname;
                this.navigate(pathname);
            }
        });
    }
    addHandler(viewName, handler) {
        this.handlers[viewName] = handler;
    }
    navigate(path) {
        // Update browser history
        window.history.pushState(null, '', path);
        // Handle the new route
        this.handleLocationChange();
    }
    handleLocationChange() {
        const path = window.location.pathname;
        const viewName = this.getViewName(path);
        if (viewName !== this.currentRoute) {
            this.currentRoute = viewName;
            this.renderView(viewName);
        }
    }
    getViewName(path) {
        // Find matching route
        for (const [route, viewName] of Object.entries(this.routes)) {
            if (path === route) {
                return viewName;
            }
        }
        // Return not found route if no match
        return this.notFoundRoute;
    }
    renderView(viewName) {
        // Clear container
        this.appContainer.innerHTML = '';
        // Add header
        this.renderHeader();
        // Create main content container
        const mainContent = document.createElement('div');
        mainContent.id = 'main-content';
        this.appContainer.appendChild(mainContent);
        // Get handler for view
        const handler = this.handlers[viewName];
        if (handler) {
            // Call handler to render view
            handler(mainContent);
        }
        else {
            // Fallback to not found
            const notFoundHandler = this.handlers[this.notFoundRoute];
            if (notFoundHandler) {
                notFoundHandler(mainContent);
            }
            else {
                mainContent.innerHTML += '<div class="p-4">Page not found</div>';
            }
        }
    }
    renderHeader() {
        const header = document.createElement('header');
        header.className = 'bg-white shadow';
        header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <a href="/" class="nav-link text-xl font-bold text-indigo-600">Transcend</a>
            </div>
          </div>
          <div class="ml-6 flex items-center" id="auth-actions">
            ${this.currentRoute === 'login' ?
            `<a href="/register" class="nav-link ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Register
              </a>` :
            `<a href="/login" class="nav-link ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Log in
              </a>`}
          </div>
        </div>
      </div>
    `;
        this.appContainer.appendChild(header);
    }
}


/***/ }),

/***/ "./src/client/ts/services/api.ts":
/*!***************************************!*\
  !*** ./src/client/ts/services/api.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ApiService: () => (/* binding */ ApiService)
/* harmony export */ });
class ApiService {
    constructor() { }
    async register(username, email, password) {
        try {
            const response = await fetch('/api/register', {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Registration failed'
            };
        }
    }
}


/***/ }),

/***/ "./src/client/ts/views/login.ts":
/*!**************************************!*\
  !*** ./src/client/ts/views/login.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LoginView: () => (/* binding */ LoginView)
/* harmony export */ });
class LoginView {
    constructor(container, router) {
        this.container = container;
        this.router = router;
    }
    // <p class="mt-2 text-sm text-gray-600">
    //   Or <a href="/register" class="nav-link font-medium text-indigo-600 hover:text-indigo-500">create a new account</a>
    // </p>
    render() {
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


/***/ }),

/***/ "./src/client/ts/views/register.ts":
/*!*****************************************!*\
  !*** ./src/client/ts/views/register.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RegisterView: () => (/* binding */ RegisterView)
/* harmony export */ });
class RegisterView {
    constructor(container, router, apiService) {
        this.container = container;
        this.router = router;
        this.apiService = apiService;
    }
    render() {
        this.container.innerHTML = `
      <div class="py-10">
        <main>
          <div class="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-900">Create an account</h1>
                <p class="mt-2 text-sm text-gray-600">
                  Or <a href="/login" class="nav-link font-medium text-indigo-600 hover:text-indigo-500">sign in to your account</a>
                </p>
              </div>
              
              <form id="register-form" class="mt-8 space-y-6">
                <div id="register-error" class="rounded-md bg-red-50 p-4 hidden">
                  <div class="flex">
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800" id="register-error-message"></h3>
                    </div>
                  </div>
                </div>
                
                <div id="register-success" class="rounded-md bg-green-50 p-4 hidden">
                  <div class="flex">
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-green-800" id="register-success-message"></h3>
                    </div>
                  </div>
                </div>
                
                <div class="rounded-md shadow-sm space-y-4">
                  <div>
                    <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                    <input id="username" name="username" type="text" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  </div>
                  
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                    <input id="email" name="email" type="email" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  </div>
                  
                  <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input id="password" name="password" type="password" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                  </div>
                  
                  <div>
                    <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input id="confirm-password" name="confirmPassword" type="password" required 
                           class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  </div>
                </div>
                
                <div>
                  <button type="submit" 
                         class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Register
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    `;
        // Add event listeners
        const registerForm = this.container.querySelector('#register-form');
        const errorMessage = this.container.querySelector('#register-error-message');
        const errorContainer = this.container.querySelector('#register-error');
        const successMessage = this.container.querySelector('#register-success-message');
        const successContainer = this.container.querySelector('#register-success');
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Hide messages
            errorContainer.classList.add('hidden');
            successContainer.classList.add('hidden');
            // Get form data
            const usernameInput = registerForm.querySelector('#username');
            const emailInput = registerForm.querySelector('#email');
            const passwordInput = registerForm.querySelector('#password');
            const confirmPasswordInput = registerForm.querySelector('#confirm-password');
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            // Basic validation
            if (!username || !email || !password || !confirmPassword) {
                errorMessage.textContent = 'All fields are required';
                errorContainer.classList.remove('hidden');
                return;
            }
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errorMessage.textContent = 'Please enter a valid email address';
                errorContainer.classList.remove('hidden');
                return;
            }
            // Password validation
            if (password.length < 8) {
                errorMessage.textContent = 'Password must be at least 8 characters long';
                errorContainer.classList.remove('hidden');
                return;
            }
            // Confirm password
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorContainer.classList.remove('hidden');
                return;
            }
            // Attempt registration
            const result = await this.apiService.register(username, email, password);
            if (result.success) {
                // Show success message
                successMessage.textContent = result.message || 'Registration successful!';
                successContainer.classList.remove('hidden');
                // Clear form
                registerForm.reset();
                // Redirect to login after a delay
                setTimeout(() => {
                    this.router.navigate('/login');
                }, 2000);
            }
            else {
                // Show error message
                errorMessage.textContent = result.error || 'Registration failed';
                errorContainer.classList.remove('hidden');
            }
        });
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*******************************!*\
  !*** ./src/client/ts/main.ts ***!
  \*******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./router */ "./src/client/ts/router.ts");
/* harmony import */ var _views_login__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./views/login */ "./src/client/ts/views/login.ts");
/* harmony import */ var _views_register__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./views/register */ "./src/client/ts/views/register.ts");
/* harmony import */ var _services_api__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./services/api */ "./src/client/ts/services/api.ts");




// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get app container
    const appContainer = document.getElementById('app');
    if (!appContainer) {
        console.error('App container not found');
        return;
    }
    // Initialize API service
    const apiService = new _services_api__WEBPACK_IMPORTED_MODULE_3__.ApiService();
    // Define routes
    const routes = {
        '/': 'login',
        '/login': 'login',
        '/register': 'register'
    };
    // Initialize router
    const router = new _router__WEBPACK_IMPORTED_MODULE_0__.Router({
        appContainer,
        routes,
        notFoundRoute: 'login'
    });
    // Register view handlers
    router.addHandler('login', (container) => {
        const loginView = new _views_login__WEBPACK_IMPORTED_MODULE_1__.LoginView(container, router);
        loginView.render();
    });
    router.addHandler('register', (container) => {
        const registerView = new _views_register__WEBPACK_IMPORTED_MODULE_2__.RegisterView(container, router, apiService);
        registerView.render();
    });
    // Initialize router
    router.init();
});

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFVLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxtREFBUyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNuRCxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckIsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUkseURBQVksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JFLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztJQUVILG9CQUFvQjtJQUNwQixNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90cmFuc2NlbmQvLi9zcmMvY2xpZW50L3RzL3JvdXRlci50cyIsIndlYnBhY2s6Ly90cmFuc2NlbmQvLi9zcmMvY2xpZW50L3RzL3NlcnZpY2VzL2FwaS50cyIsIndlYnBhY2s6Ly90cmFuc2NlbmQvLi9zcmMvY2xpZW50L3RzL3ZpZXdzL2xvZ2luLnRzIiwid2VicGFjazovL3RyYW5zY2VuZC8uL3NyYy9jbGllbnQvdHMvdmlld3MvcmVnaXN0ZXIudHMiLCJ3ZWJwYWNrOi8vdHJhbnNjZW5kL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RyYW5zY2VuZC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vdHJhbnNjZW5kL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vdHJhbnNjZW5kL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vdHJhbnNjZW5kLy4vc3JjL2NsaWVudC90cy9tYWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbInR5cGUgUm91dGVIYW5kbGVyID0gKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpID0+IHZvaWQ7XG5cbmludGVyZmFjZSBSb3V0ZXJPcHRpb25zIHtcbiAgYXBwQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcbiAgcm91dGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBub3RGb3VuZFJvdXRlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGFwcENvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgcm91dGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBwcml2YXRlIGhhbmRsZXJzOiBSZWNvcmQ8c3RyaW5nLCBSb3V0ZUhhbmRsZXI+ID0ge307XG4gIHByaXZhdGUgbm90Rm91bmRSb3V0ZTogc3RyaW5nO1xuICBwcml2YXRlIGN1cnJlbnRSb3V0ZTogc3RyaW5nID0gJyc7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogUm91dGVyT3B0aW9ucykge1xuICAgIHRoaXMuYXBwQ29udGFpbmVyID0gb3B0aW9ucy5hcHBDb250YWluZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSBvcHRpb25zLnJvdXRlcztcbiAgICB0aGlzLm5vdEZvdW5kUm91dGUgPSBvcHRpb25zLm5vdEZvdW5kUm91dGU7XG4gIH1cblxuICBwdWJsaWMgaW5pdCgpOiB2b2lkIHtcbiAgICAvLyBIYW5kbGUgaW5pdGlhbCBsb2FkXG4gICAgdGhpcy5oYW5kbGVMb2NhdGlvbkNoYW5nZSgpO1xuXG4gICAgLy8gSGFuZGxlIGJyb3dzZXIgYmFjay9mb3J3YXJkXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgKCkgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVMb2NhdGlvbkNoYW5nZSgpO1xuICAgIH0pO1xuXG4gICAgLy8gSW50ZXJjZXB0IGxpbmsgY2xpY2tzIGZvciBjbGllbnQtc2lkZSBuYXZpZ2F0aW9uXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICBjb25zdCBsaW5rID0gdGFyZ2V0LmNsb3Nlc3QoJ2EubmF2LWxpbmsnKSBhcyBIVE1MQW5jaG9yRWxlbWVudDtcbiAgICAgIFxuICAgICAgaWYgKGxpbmsgJiYgbGluay5ocmVmKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwobGluay5ocmVmKTtcbiAgICAgICAgY29uc3QgcGF0aG5hbWUgPSB1cmwucGF0aG5hbWU7XG4gICAgICAgIFxuICAgICAgICB0aGlzLm5hdmlnYXRlKHBhdGhuYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhZGRIYW5kbGVyKHZpZXdOYW1lOiBzdHJpbmcsIGhhbmRsZXI6IFJvdXRlSGFuZGxlcik6IHZvaWQge1xuICAgIHRoaXMuaGFuZGxlcnNbdmlld05hbWVdID0gaGFuZGxlcjtcbiAgfVxuXG4gIHB1YmxpYyBuYXZpZ2F0ZShwYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAvLyBVcGRhdGUgYnJvd3NlciBoaXN0b3J5XG4gICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBwYXRoKTtcbiAgICBcbiAgICAvLyBIYW5kbGUgdGhlIG5ldyByb3V0ZVxuICAgIHRoaXMuaGFuZGxlTG9jYXRpb25DaGFuZ2UoKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlTG9jYXRpb25DaGFuZ2UoKTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcbiAgICBjb25zdCB2aWV3TmFtZSA9IHRoaXMuZ2V0Vmlld05hbWUocGF0aCk7XG4gICAgXG4gICAgaWYgKHZpZXdOYW1lICE9PSB0aGlzLmN1cnJlbnRSb3V0ZSkge1xuICAgICAgdGhpcy5jdXJyZW50Um91dGUgPSB2aWV3TmFtZTtcbiAgICAgIHRoaXMucmVuZGVyVmlldyh2aWV3TmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRWaWV3TmFtZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIEZpbmQgbWF0Y2hpbmcgcm91dGVcbiAgICBmb3IgKGNvbnN0IFtyb3V0ZSwgdmlld05hbWVdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMucm91dGVzKSkge1xuICAgICAgaWYgKHBhdGggPT09IHJvdXRlKSB7XG4gICAgICAgIHJldHVybiB2aWV3TmFtZTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gUmV0dXJuIG5vdCBmb3VuZCByb3V0ZSBpZiBubyBtYXRjaFxuICAgIHJldHVybiB0aGlzLm5vdEZvdW5kUm91dGU7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclZpZXcodmlld05hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIENsZWFyIGNvbnRhaW5lclxuICAgIHRoaXMuYXBwQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgIFxuICAgIC8vIEFkZCBoZWFkZXJcbiAgICB0aGlzLnJlbmRlckhlYWRlcigpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBtYWluIGNvbnRlbnQgY29udGFpbmVyXG4gICAgY29uc3QgbWFpbkNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBtYWluQ29udGVudC5pZCA9ICdtYWluLWNvbnRlbnQnO1xuICAgIHRoaXMuYXBwQ29udGFpbmVyLmFwcGVuZENoaWxkKG1haW5Db250ZW50KTtcbiAgICBcbiAgICAvLyBHZXQgaGFuZGxlciBmb3Igdmlld1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmhhbmRsZXJzW3ZpZXdOYW1lXTtcbiAgICBcbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgLy8gQ2FsbCBoYW5kbGVyIHRvIHJlbmRlciB2aWV3XG4gICAgICBoYW5kbGVyKG1haW5Db250ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2sgdG8gbm90IGZvdW5kXG4gICAgICBjb25zdCBub3RGb3VuZEhhbmRsZXIgPSB0aGlzLmhhbmRsZXJzW3RoaXMubm90Rm91bmRSb3V0ZV07XG4gICAgICBpZiAobm90Rm91bmRIYW5kbGVyKSB7XG4gICAgICAgIG5vdEZvdW5kSGFuZGxlcihtYWluQ29udGVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYWluQ29udGVudC5pbm5lckhUTUwgKz0gJzxkaXYgY2xhc3M9XCJwLTRcIj5QYWdlIG5vdCBmb3VuZDwvZGl2Pic7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJIZWFkZXIoKTogdm9pZCB7XG4gICAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaGVhZGVyJyk7XG4gICAgaGVhZGVyLmNsYXNzTmFtZSA9ICdiZy13aGl0ZSBzaGFkb3cnO1xuICAgIGhlYWRlci5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwibWF4LXctN3hsIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LThcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGgtMTZcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmxleFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZsZXgtc2hyaW5rLTAgZmxleCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgPGEgaHJlZj1cIi9cIiBjbGFzcz1cIm5hdi1saW5rIHRleHQteGwgZm9udC1ib2xkIHRleHQtaW5kaWdvLTYwMFwiPlRyYW5zY2VuZDwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtbC02IGZsZXggaXRlbXMtY2VudGVyXCIgaWQ9XCJhdXRoLWFjdGlvbnNcIj5cbiAgICAgICAgICAgICR7dGhpcy5jdXJyZW50Um91dGUgPT09ICdsb2dpbicgPyBcbiAgICAgICAgICAgICAgYDxhIGhyZWY9XCIvcmVnaXN0ZXJcIiBjbGFzcz1cIm5hdi1saW5rIG1sLTMgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyIHB4LTQgcHktMiBib3JkZXIgYm9yZGVyLXRyYW5zcGFyZW50IHRleHQtc20gZm9udC1tZWRpdW0gcm91bmRlZC1tZCBzaGFkb3ctc20gdGV4dC13aGl0ZSBiZy1pbmRpZ28tNjAwIGhvdmVyOmJnLWluZGlnby03MDBcIj5cbiAgICAgICAgICAgICAgICBSZWdpc3RlclxuICAgICAgICAgICAgICA8L2E+YCA6IFxuICAgICAgICAgICAgICBgPGEgaHJlZj1cIi9sb2dpblwiIGNsYXNzPVwibmF2LWxpbmsgbWwtMyBpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgcHgtNCBweS0yIGJvcmRlciBib3JkZXItdHJhbnNwYXJlbnQgdGV4dC1zbSBmb250LW1lZGl1bSByb3VuZGVkLW1kIHNoYWRvdy1zbSB0ZXh0LXdoaXRlIGJnLWluZGlnby02MDAgaG92ZXI6YmctaW5kaWdvLTcwMFwiPlxuICAgICAgICAgICAgICAgIExvZyBpblxuICAgICAgICAgICAgICA8L2E+YFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gICAgXG4gICAgdGhpcy5hcHBDb250YWluZXIuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwaVNlcnZpY2Uge1xuICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICBcbiAgICBwdWJsaWMgYXN5bmMgcmVnaXN0ZXIodXNlcm5hbWU6IHN0cmluZywgZW1haWw6IHN0cmluZywgcGFzc3dvcmQ6IHN0cmluZyk6IFByb21pc2U8e3N1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcsIGVycm9yPzogc3RyaW5nfT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FwaS9yZWdpc3RlcicsIHtcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgfSxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lLCBlbWFpbCwgcGFzc3dvcmQgfSlcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgICAgZXJyb3I6IGRhdGEuZXJyb3IgfHwgJ1JlZ2lzdHJhdGlvbiBmYWlsZWQnIFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IFxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZSB8fCAnUmVnaXN0cmF0aW9uIHN1Y2Nlc3NmdWwnIFxuICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdSZWdpc3RyYXRpb24gZmFpbGVkJyBcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgIiwiaW1wb3J0IHsgUm91dGVyIH0gZnJvbSAnLi4vcm91dGVyJztcblxuZXhwb3J0IGNsYXNzIExvZ2luVmlldyB7XG4gIHByaXZhdGUgY29udGFpbmVyOiBIVE1MRWxlbWVudDtcbiAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlcjtcbiAgXG4gIGNvbnN0cnVjdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHJvdXRlcjogUm91dGVyKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgdGhpcy5yb3V0ZXIgPSByb3V0ZXI7XG4gIH1cbiAgXG4gICAvLyA8cCBjbGFzcz1cIm10LTIgdGV4dC1zbSB0ZXh0LWdyYXktNjAwXCI+XG4gICAgICAgICAgICAgICAgLy8gICBPciA8YSBocmVmPVwiL3JlZ2lzdGVyXCIgY2xhc3M9XCJuYXYtbGluayBmb250LW1lZGl1bSB0ZXh0LWluZGlnby02MDAgaG92ZXI6dGV4dC1pbmRpZ28tNTAwXCI+Y3JlYXRlIGEgbmV3IGFjY291bnQ8L2E+XG4gICAgICAgICAgICAgICAgLy8gPC9wPlxuICBwdWJsaWMgcmVuZGVyKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGFpbmVyLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJweS0xMFwiPlxuICAgICAgICA8bWFpbj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibWF4LXctbWQgbXgtYXV0byBweC00IHNtOnB4LTYgbGc6cHgtOFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJnLXdoaXRlIHNoYWRvdy1tZCByb3VuZGVkLWxnIHAtOFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICA8aDEgY2xhc3M9XCJ0ZXh0LTJ4bCBmb250LWJvbGQgdGV4dC1ncmF5LTkwMFwiPkxvZyBpbiB0byB5b3VyIGFjY291bnQ8L2gxPlxuICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgPGZvcm0gaWQ9XCJsb2dpbi1mb3JtXCIgY2xhc3M9XCJtdC04IHNwYWNlLXktNlwiPlxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJsb2dpbi1tZXNzYWdlXCIgY2xhc3M9XCJyb3VuZGVkLW1kIGJnLWJsdWUtNTAgcC00XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmxleFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWwtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMSBjbGFzcz1cInRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LWJsdWUtODAwIHRleHQtY2VudGVyXCI+V2VsY29tZSB0byB0cmFuc2NlbmRlbmNlITwvaDE+ICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicm91bmRlZC1tZCBzaGFkb3ctc20gc3BhY2UteS00XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwidXNlcm5hbWVcIiBjbGFzcz1cImJsb2NrIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTcwMFwiPlVzZXJuYW1lPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGlkPVwidXNlcm5hbWVcIiBuYW1lPVwidXNlcm5hbWVcIiB0eXBlPVwidGV4dFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJtdC0xIGJsb2NrIHctZnVsbCBweC0zIHB5LTIgYm9yZGVyIGJvcmRlci1ncmF5LTMwMCByb3VuZGVkLW1kIHNoYWRvdy1zbSBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6cmluZy1pbmRpZ28tNTAwIGZvY3VzOmJvcmRlci1pbmRpZ28tNTAwXCI+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInBhc3N3b3JkXCIgY2xhc3M9XCJibG9jayB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS03MDBcIj5QYXNzd29yZDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBpZD1cInBhc3N3b3JkXCIgbmFtZT1cInBhc3N3b3JkXCIgdHlwZT1cInBhc3N3b3JkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cIm10LTEgYmxvY2sgdy1mdWxsIHB4LTMgcHktMiBib3JkZXIgYm9yZGVyLWdyYXktMzAwIHJvdW5kZWQtbWQgc2hhZG93LXNtIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpyaW5nLWluZGlnby01MDAgZm9jdXM6Ym9yZGVyLWluZGlnby01MDBcIj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidy1mdWxsIGZsZXgganVzdGlmeS1jZW50ZXIgcHktMiBweC00IGJvcmRlciBib3JkZXItdHJhbnNwYXJlbnQgcm91bmRlZC1tZCBzaGFkb3ctc20gdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LXdoaXRlIGJnLWluZGlnby02MDAgaG92ZXI6YmctaW5kaWdvLTcwMCBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6cmluZy0yIGZvY3VzOnJpbmctb2Zmc2V0LTIgZm9jdXM6cmluZy1pbmRpZ28tNTAwXCI+XG4gICAgICAgICAgICAgICAgICAgIExvZyBpblxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L21haW4+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG59XG4iLCJpbXBvcnQgeyBSb3V0ZXIgfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHsgQXBpU2VydmljZSB9IGZyb20gJy4uL3NlcnZpY2VzL2FwaSc7XG5cbmV4cG9ydCBjbGFzcyBSZWdpc3RlclZpZXcge1xuICBwcml2YXRlIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XG4gIHByaXZhdGUgcm91dGVyOiBSb3V0ZXI7XG4gIHByaXZhdGUgYXBpU2VydmljZTogQXBpU2VydmljZTtcbiAgXG4gIGNvbnN0cnVjdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIHJvdXRlcjogUm91dGVyLCBhcGlTZXJ2aWNlOiBBcGlTZXJ2aWNlKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgdGhpcy5yb3V0ZXIgPSByb3V0ZXI7XG4gICAgdGhpcy5hcGlTZXJ2aWNlID0gYXBpU2VydmljZTtcbiAgfVxuICBcbiAgcHVibGljIHJlbmRlcigpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwicHktMTBcIj5cbiAgICAgICAgPG1haW4+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1heC13LW1kIG14LWF1dG8gcHgtNCBzbTpweC02IGxnOnB4LThcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiZy13aGl0ZSBzaGFkb3ctbWQgcm91bmRlZC1sZyBwLThcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInRleHQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzPVwidGV4dC0yeGwgZm9udC1ib2xkIHRleHQtZ3JheS05MDBcIj5DcmVhdGUgYW4gYWNjb3VudDwvaDE+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJtdC0yIHRleHQtc20gdGV4dC1ncmF5LTYwMFwiPlxuICAgICAgICAgICAgICAgICAgT3IgPGEgaHJlZj1cIi9sb2dpblwiIGNsYXNzPVwibmF2LWxpbmsgZm9udC1tZWRpdW0gdGV4dC1pbmRpZ28tNjAwIGhvdmVyOnRleHQtaW5kaWdvLTUwMFwiPnNpZ24gaW4gdG8geW91ciBhY2NvdW50PC9hPlxuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICA8Zm9ybSBpZD1cInJlZ2lzdGVyLWZvcm1cIiBjbGFzcz1cIm10LTggc3BhY2UteS02XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInJlZ2lzdGVyLWVycm9yXCIgY2xhc3M9XCJyb3VuZGVkLW1kIGJnLXJlZC01MCBwLTQgaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmxleFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWwtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzcz1cInRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1yZWQtODAwXCIgaWQ9XCJyZWdpc3Rlci1lcnJvci1tZXNzYWdlXCI+PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwicmVnaXN0ZXItc3VjY2Vzc1wiIGNsYXNzPVwicm91bmRlZC1tZCBiZy1ncmVlbi01MCBwLTQgaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmxleFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWwtM1wiPlxuICAgICAgICAgICAgICAgICAgICAgIDxoMyBjbGFzcz1cInRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmVlbi04MDBcIiBpZD1cInJlZ2lzdGVyLXN1Y2Nlc3MtbWVzc2FnZVwiPjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJvdW5kZWQtbWQgc2hhZG93LXNtIHNwYWNlLXktNFwiPlxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInVzZXJuYW1lXCIgY2xhc3M9XCJibG9jayB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtZ3JheS03MDBcIj5Vc2VybmFtZTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBpZD1cInVzZXJuYW1lXCIgbmFtZT1cInVzZXJuYW1lXCIgdHlwZT1cInRleHRcIiByZXF1aXJlZCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwibXQtMSBibG9jayB3LWZ1bGwgcHgtMyBweS0yIGJvcmRlciBib3JkZXItZ3JheS0zMDAgcm91bmRlZC1tZCBzaGFkb3ctc20gZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOnJpbmctaW5kaWdvLTUwMCBmb2N1czpib3JkZXItaW5kaWdvLTUwMFwiPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJlbWFpbFwiIGNsYXNzPVwiYmxvY2sgdGV4dC1zbSBmb250LW1lZGl1bSB0ZXh0LWdyYXktNzAwXCI+RW1haWwgYWRkcmVzczwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCBpZD1cImVtYWlsXCIgbmFtZT1cImVtYWlsXCIgdHlwZT1cImVtYWlsXCIgcmVxdWlyZWQgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cIm10LTEgYmxvY2sgdy1mdWxsIHB4LTMgcHktMiBib3JkZXIgYm9yZGVyLWdyYXktMzAwIHJvdW5kZWQtbWQgc2hhZG93LXNtIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpyaW5nLWluZGlnby01MDAgZm9jdXM6Ym9yZGVyLWluZGlnby01MDBcIj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwicGFzc3dvcmRcIiBjbGFzcz1cImJsb2NrIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTcwMFwiPlBhc3N3b3JkPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGlkPVwicGFzc3dvcmRcIiBuYW1lPVwicGFzc3dvcmRcIiB0eXBlPVwicGFzc3dvcmRcIiByZXF1aXJlZCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwibXQtMSBibG9jayB3LWZ1bGwgcHgtMyBweS0yIGJvcmRlciBib3JkZXItZ3JheS0zMDAgcm91bmRlZC1tZCBzaGFkb3ctc20gZm9jdXM6b3V0bGluZS1ub25lIGZvY3VzOnJpbmctaW5kaWdvLTUwMCBmb2N1czpib3JkZXItaW5kaWdvLTUwMFwiPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cIm10LTEgdGV4dC14cyB0ZXh0LWdyYXktNTAwXCI+TXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnM8L3A+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cImNvbmZpcm0tcGFzc3dvcmRcIiBjbGFzcz1cImJsb2NrIHRleHQtc20gZm9udC1tZWRpdW0gdGV4dC1ncmF5LTcwMFwiPkNvbmZpcm0gUGFzc3dvcmQ8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9XCJjb25maXJtLXBhc3N3b3JkXCIgbmFtZT1cImNvbmZpcm1QYXNzd29yZFwiIHR5cGU9XCJwYXNzd29yZFwiIHJlcXVpcmVkIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJtdC0xIGJsb2NrIHctZnVsbCBweC0zIHB5LTIgYm9yZGVyIGJvcmRlci1ncmF5LTMwMCByb3VuZGVkLW1kIHNoYWRvdy1zbSBmb2N1czpvdXRsaW5lLW5vbmUgZm9jdXM6cmluZy1pbmRpZ28tNTAwIGZvY3VzOmJvcmRlci1pbmRpZ28tNTAwXCI+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ3LWZ1bGwgZmxleCBqdXN0aWZ5LWNlbnRlciBweS0yIHB4LTQgYm9yZGVyIGJvcmRlci10cmFuc3BhcmVudCByb3VuZGVkLW1kIHNoYWRvdy1zbSB0ZXh0LXNtIGZvbnQtbWVkaXVtIHRleHQtd2hpdGUgYmctaW5kaWdvLTYwMCBob3ZlcjpiZy1pbmRpZ28tNzAwIGZvY3VzOm91dGxpbmUtbm9uZSBmb2N1czpyaW5nLTIgZm9jdXM6cmluZy1vZmZzZXQtMiBmb2N1czpyaW5nLWluZGlnby01MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgUmVnaXN0ZXJcbiAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9tYWluPlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgICBcbiAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXJzXG4gICAgY29uc3QgcmVnaXN0ZXJGb3JtID0gdGhpcy5jb250YWluZXIucXVlcnlTZWxlY3RvcignI3JlZ2lzdGVyLWZvcm0nKSBhcyBIVE1MRm9ybUVsZW1lbnQ7XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gdGhpcy5jb250YWluZXIucXVlcnlTZWxlY3RvcignI3JlZ2lzdGVyLWVycm9yLW1lc3NhZ2UnKSBhcyBIVE1MRWxlbWVudDtcbiAgICBjb25zdCBlcnJvckNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJyNyZWdpc3Rlci1lcnJvcicpIGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IHN1Y2Nlc3NNZXNzYWdlID0gdGhpcy5jb250YWluZXIucXVlcnlTZWxlY3RvcignI3JlZ2lzdGVyLXN1Y2Nlc3MtbWVzc2FnZScpIGFzIEhUTUxFbGVtZW50O1xuICAgIGNvbnN0IHN1Y2Nlc3NDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcjcmVnaXN0ZXItc3VjY2VzcycpIGFzIEhUTUxFbGVtZW50O1xuICAgIFxuICAgIHJlZ2lzdGVyRm9ybT8uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgYXN5bmMgKGUpID0+IHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIFxuICAgICAgLy8gSGlkZSBtZXNzYWdlc1xuICAgICAgZXJyb3JDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICBzdWNjZXNzQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgXG4gICAgICAvLyBHZXQgZm9ybSBkYXRhXG4gICAgICBjb25zdCB1c2VybmFtZUlucHV0ID0gcmVnaXN0ZXJGb3JtLnF1ZXJ5U2VsZWN0b3IoJyN1c2VybmFtZScpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBjb25zdCBlbWFpbElucHV0ID0gcmVnaXN0ZXJGb3JtLnF1ZXJ5U2VsZWN0b3IoJyNlbWFpbCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBjb25zdCBwYXNzd29yZElucHV0ID0gcmVnaXN0ZXJGb3JtLnF1ZXJ5U2VsZWN0b3IoJyNwYXNzd29yZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBjb25zdCBjb25maXJtUGFzc3dvcmRJbnB1dCA9IHJlZ2lzdGVyRm9ybS5xdWVyeVNlbGVjdG9yKCcjY29uZmlybS1wYXNzd29yZCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBcbiAgICAgIGNvbnN0IHVzZXJuYW1lID0gdXNlcm5hbWVJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgICBjb25zdCBlbWFpbCA9IGVtYWlsSW5wdXQudmFsdWUudHJpbSgpO1xuICAgICAgY29uc3QgcGFzc3dvcmQgPSBwYXNzd29yZElucHV0LnZhbHVlO1xuICAgICAgY29uc3QgY29uZmlybVBhc3N3b3JkID0gY29uZmlybVBhc3N3b3JkSW5wdXQudmFsdWU7XG4gICAgICBcbiAgICAgIC8vIEJhc2ljIHZhbGlkYXRpb25cbiAgICAgIGlmICghdXNlcm5hbWUgfHwgIWVtYWlsIHx8ICFwYXNzd29yZCB8fCAhY29uZmlybVBhc3N3b3JkKSB7XG4gICAgICAgIGVycm9yTWVzc2FnZS50ZXh0Q29udGVudCA9ICdBbGwgZmllbGRzIGFyZSByZXF1aXJlZCc7XG4gICAgICAgIGVycm9yQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEVtYWlsIHZhbGlkYXRpb25cbiAgICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcbiAgICAgIGlmICghZW1haWxSZWdleC50ZXN0KGVtYWlsKSkge1xuICAgICAgICBlcnJvck1lc3NhZ2UudGV4dENvbnRlbnQgPSAnUGxlYXNlIGVudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzcyc7XG4gICAgICAgIGVycm9yQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFBhc3N3b3JkIHZhbGlkYXRpb25cbiAgICAgIGlmIChwYXNzd29yZC5sZW5ndGggPCA4KSB7XG4gICAgICAgIGVycm9yTWVzc2FnZS50ZXh0Q29udGVudCA9ICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcmFjdGVycyBsb25nJztcbiAgICAgICAgZXJyb3JDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gQ29uZmlybSBwYXNzd29yZFxuICAgICAgaWYgKHBhc3N3b3JkICE9PSBjb25maXJtUGFzc3dvcmQpIHtcbiAgICAgICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gJ1Bhc3N3b3JkcyBkbyBub3QgbWF0Y2gnO1xuICAgICAgICBlcnJvckNvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBBdHRlbXB0IHJlZ2lzdHJhdGlvblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5hcGlTZXJ2aWNlLnJlZ2lzdGVyKHVzZXJuYW1lLCBlbWFpbCwgcGFzc3dvcmQpO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgc3VjY2Vzc01lc3NhZ2UudGV4dENvbnRlbnQgPSByZXN1bHQubWVzc2FnZSB8fCAnUmVnaXN0cmF0aW9uIHN1Y2Nlc3NmdWwhJztcbiAgICAgICAgc3VjY2Vzc0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGZvcm1cbiAgICAgICAgcmVnaXN0ZXJGb3JtLnJlc2V0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWRpcmVjdCB0byBsb2dpbiBhZnRlciBhIGRlbGF5XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKCcvbG9naW4nKTtcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgZXJyb3JNZXNzYWdlLnRleHRDb250ZW50ID0gcmVzdWx0LmVycm9yIHx8ICdSZWdpc3RyYXRpb24gZmFpbGVkJztcbiAgICAgICAgZXJyb3JDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCB7IFJvdXRlciB9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7IExvZ2luVmlldyB9IGZyb20gJy4vdmlld3MvbG9naW4nO1xuaW1wb3J0IHsgUmVnaXN0ZXJWaWV3IH0gZnJvbSAnLi92aWV3cy9yZWdpc3Rlcic7XG5pbXBvcnQgeyBBcGlTZXJ2aWNlIH0gZnJvbSAnLi9zZXJ2aWNlcy9hcGknO1xuXG4vLyBJbml0aWFsaXplIHRoZSBhcHBsaWNhdGlvbiB3aGVuIERPTSBpcyBmdWxseSBsb2FkZWRcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIC8vIEdldCBhcHAgY29udGFpbmVyXG4gIGNvbnN0IGFwcENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAnKSBhcyBIVE1MRWxlbWVudDtcbiAgaWYgKCFhcHBDb250YWluZXIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdBcHAgY29udGFpbmVyIG5vdCBmb3VuZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEluaXRpYWxpemUgQVBJIHNlcnZpY2VcbiAgY29uc3QgYXBpU2VydmljZSA9IG5ldyBBcGlTZXJ2aWNlKCk7XG5cbiAgLy8gRGVmaW5lIHJvdXRlc1xuICBjb25zdCByb3V0ZXMgPSB7XG4gICAgJy8nOiAnbG9naW4nLFxuICAgICcvbG9naW4nOiAnbG9naW4nLFxuICAgICcvcmVnaXN0ZXInOiAncmVnaXN0ZXInXG4gIH07XG5cbiAgLy8gSW5pdGlhbGl6ZSByb3V0ZXJcbiAgY29uc3Qgcm91dGVyID0gbmV3IFJvdXRlcih7XG4gICAgYXBwQ29udGFpbmVyLFxuICAgIHJvdXRlcyxcbiAgICBub3RGb3VuZFJvdXRlOiAnbG9naW4nXG4gIH0pO1xuXG4gIC8vIFJlZ2lzdGVyIHZpZXcgaGFuZGxlcnNcbiAgcm91dGVyLmFkZEhhbmRsZXIoJ2xvZ2luJywgKGNvbnRhaW5lcikgPT4ge1xuICAgIGNvbnN0IGxvZ2luVmlldyA9IG5ldyBMb2dpblZpZXcoY29udGFpbmVyLCByb3V0ZXIpO1xuICAgIGxvZ2luVmlldy5yZW5kZXIoKTtcbiAgfSk7XG5cbiAgcm91dGVyLmFkZEhhbmRsZXIoJ3JlZ2lzdGVyJywgKGNvbnRhaW5lcikgPT4ge1xuICAgIGNvbnN0IHJlZ2lzdGVyVmlldyA9IG5ldyBSZWdpc3RlclZpZXcoY29udGFpbmVyLCByb3V0ZXIsIGFwaVNlcnZpY2UpO1xuICAgIHJlZ2lzdGVyVmlldy5yZW5kZXIoKTtcbiAgfSk7XG5cbiAgLy8gSW5pdGlhbGl6ZSByb3V0ZXJcbiAgcm91dGVyLmluaXQoKTtcbn0pOyJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==