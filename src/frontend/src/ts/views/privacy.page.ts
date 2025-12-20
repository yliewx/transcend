import { Page } from '../types';

export class PrivacyPage implements Page {
  private element: HTMLElement | null = null;

  render(): HTMLElement {
    if (this.element) return this.element;

    const container = document.createElement('div');
    container.className =
      'max-w-4xl mx-auto px-6 py-10 prose dark:prose-invert';

    container.innerHTML = `
      <h1>Privacy Policy & Terms of Service</h1>
      <p><strong>Last updated:</strong> 20 December 2025</p>

      <hr />

      <h2>Privacy Policy</h2>
      <p>
        Parsley Pong respects your privacy and is committed to protecting your
        personal data.
      </p>

      <h3>Information We Collect</h3>
      <ul>
        <li>Account information (username, email)</li>
        <li>Gameplay data (scores, rankings, match history)</li>
        <li>Technical data (IP address, browser, device)</li>
      </ul>

      <h3>How We Use Your Information</h3>
      <ul>
        <li>Gameplay and tournaments</li>
        <li>Security and abuse prevention</li>
        <li>Application improvements</li>
      </ul>

      <h3>Data Security</h3>
      <p>We use reasonable security measures to protect your data.</p>

      <h3>User Rights</h3>
      <p>You may request access or deletion of your personal data.</p>

      <hr />

      <h2>Terms of Service</h2>

      <h3>Eligibility</h3>
      <p>You must be at least 13 years old to use Parsley Pong.</p>

      <h3>User Accounts</h3>
      <p>You are responsible for all activity performed using your account.</p>

      <h3>Acceptable Use</h3>
      <ul>
        <li>No cheating or exploiting</li>
        <li>No harassment or abuse</li>
        <li>No unauthorized access</li>
      </ul>

      <h3>Gameplay & Rankings</h3>
      <p>All match results and rankings are determined server-side.</p>

      <h3>Service Availability</h3>
      <p>Parsley Pong is provided "as is" without guarantees of uptime.</p>

      <h3>Termination</h3>
      <p>Accounts may be suspended or terminated for violations.</p>
    `;

    this.element = container;
    return container;
  }

  update(): void {}
}
