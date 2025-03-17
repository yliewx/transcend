export interface Page {
    render(): HTMLElement | Promise<HTMLElement>;
  }