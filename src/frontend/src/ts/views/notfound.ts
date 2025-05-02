import { Page } from '../types';

export class NotFoundPage implements Page {
    private element: HTMLElement | null = null;
    
    constructor() {}

    render(): HTMLElement {
        if (this.element) {
            return this.element;
        }
        
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="flex items-center justify-center h-screen">
                <div class="text-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p class="text-xl text-gray-600 mb-8">Page not found</p>
                <button class="nav-link px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        onclick="window.history.back()">
                    Go Back
                </button>
                </div>
            </div>
        `;
        
        this.element = container;
        
        return container;
    }
    
    update(): void {}
}