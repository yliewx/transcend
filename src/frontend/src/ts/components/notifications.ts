type NotificationType = 'success' | 'error' | 'info';

export class Notifications {
  private static container: HTMLElement | null = null;
  private static notifications: HTMLElement[] = [];

  private static ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed bottom-4 right-4 flex flex-col items-end space-y-4 z-50';
      document.body.appendChild(this.container);
    }
  }

  public static show(type: NotificationType, message: string, duration: number = 5000): void {
    this.ensureContainer();

    const notification = document.createElement('div');
    notification.className = `p-4 rounded-md shadow-lg transition transform duration-300 opacity-0 translate-y-4 max-w-md ${
      type === 'success'
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
        : type === 'error'
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    }`;

    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          ${this.getIcon(type)}
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <div class="ml-auto pl-3">
          <button class="notification-close inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            type === 'success'
              ? 'text-green-500 hover:text-green-600 focus:ring-green-400 dark:text-green-300 dark:hover:text-green-200'
              : type === 'error'
              ? 'text-red-500 hover:text-red-600 focus:ring-red-400 dark:text-red-300 dark:hover:text-red-200'
              : 'text-blue-500 hover:text-blue-600 focus:ring-blue-400 dark:text-blue-300 dark:hover:text-blue-200'
          }">
            <span class="sr-only">Dismiss</span>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;

    this.container!.appendChild(notification);
    this.notifications.push(notification);

    requestAnimationFrame(() => {
      notification.classList.remove('opacity-0', 'translate-y-4');
      notification.classList.add('opacity-100', 'translate-y-0');
    });

    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(notification));
    }

    setTimeout(() => {
      if (this.container!.contains(notification)) {
        this.dismiss(notification);
      }
    }, duration);
  }

  private static dismiss(notification: HTMLElement) {
    notification.classList.remove('opacity-100', 'translate-y-0');
    notification.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => {
      notification.remove();
      this.notifications = this.notifications.filter(n => n !== notification);
    }, 500);
  }

  private static getIcon(type: NotificationType): string {
    if (type === 'success') {
      return `<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`;
    }
    if (type === 'error') {
      return `<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`;
    }
    return `<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>`;
  }
}
