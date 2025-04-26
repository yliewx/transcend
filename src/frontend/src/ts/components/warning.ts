export class BrowserWarning {
    render(): HTMLElement {
      const warning = document.createElement('div');
      warning.textContent = 'Your browser is not officially supported. Please use Chrome or Firefox for the best experience.';
      warning.className = 'fixed top-0 left-0 right-0 p-4 bg-yellow-400 text-black text-center font-bold shadow-md z-50';
      return warning;
    }
  }
  