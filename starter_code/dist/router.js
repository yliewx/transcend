export class Router {
    constructor(routes, rootElement) {
        this.currentComponent = null;
        this.routes = routes;
        this.rootElement = rootElement;
        // Handle navigation
        window.addEventListener('popstate', () => this.render());
        // Intercept link clicks for SPA navigation
        document.addEventListener('click', (e) => {
            var _a;
            const target = e.target;
            if (target.tagName === 'A' && ((_a = target.getAttribute('href')) === null || _a === void 0 ? void 0 : _a.startsWith('/'))) {
                e.preventDefault();
                this.navigate(target.getAttribute('href') || '/');
            }
        });
    }
    init() {
        // Check if we're on a path that should show the 404 page
        const path = window.location.pathname;
        const validPaths = this.routes
            .filter(route => route.path !== '*')
            .map(route => route.path);
        if (!validPaths.includes(path) && path !== '/') {
            // Invalid path, show 404 page but keep the URL
            const route = this.routes.find(route => route.path === '*');
            document.title = route.title;
            if (this.currentComponent) {
                this.rootElement.removeChild(this.currentComponent);
            }
            this.currentComponent = route.component();
            this.rootElement.appendChild(this.currentComponent);
            return;
        }
        this.render();
    }
    navigate(path) {
        window.history.pushState({}, '', path);
        this.render();
    }
    render() {
        const path = window.location.pathname;
        const route = this.routes.find(route => route.path === path)
            || this.routes.find(route => route.path === '*')
            || this.routes[0];
        // Update document title
        document.title = route.title;
        // Clear and render new component
        if (this.currentComponent) {
            this.rootElement.removeChild(this.currentComponent);
        }
        this.currentComponent = route.component();
        this.rootElement.appendChild(this.currentComponent);
    }
}
//# sourceMappingURL=router.js.map