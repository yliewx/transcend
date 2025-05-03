import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament, TournamentMatch, TournamentParticipant } from '../services/tournament.service';
import { handleParticipantJoined, handleTournamentStarted, handleMatchUpdated, handleTournamentCompleted } from '../tournament/tournament.socket';
import { onParticipantJoined, onTournamentStarted, onTournamentUpdated, onNotification } from '../tournament/tournament.event';
import { Notifications } from '../components/notifications';

export class TournamentDetailPage implements Page {
  private router: Router;
  private tournamentService: TournamentService;
  public element: HTMLElement | null = null;
  public tournament: Tournament | null = null;
  public matches: TournamentMatch[] = [];
  public participants: TournamentParticipant[] = [];
  public tournamentId: string | null = null;
  private isRegistered: boolean = false;
  private boundEventHandlers: {[key: string]: EventListener} = {};
  
  constructor(router: Router) {
    this.router = router;
    this.tournamentService = new TournamentService();
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    const wss = this.router.getWsManager();
    wss.onTournamentEvent('participant-joined', handleParticipantJoined.bind(this));
    wss.onTournamentEvent('tournament-started', handleTournamentStarted.bind(this));
    wss.onTournamentEvent('match-updated', handleMatchUpdated.bind(this));
    wss.onTournamentEvent('tournament-completed', handleTournamentCompleted.bind(this));
  }

  private setupDataEventListeners(): void {
    this.removeDataEventListeners();
    
    this.boundEventHandlers = {
      participantJoined: onParticipantJoined.bind(this) as (e: Event) => void,
      tournamentStarted: onTournamentStarted.bind(this) as (e: Event) => void,
      tournamentUpdated: onTournamentUpdated.bind(this) as (e: Event) => void,
      notification: onNotification.bind(this) as (e: Event) => void
    };
    
    Object.entries(this.boundEventHandlers).forEach(([eventName, handler]) => {
      document.addEventListener(eventName, handler);
    });
  }

  private removeDataEventListeners(): void {
    const events = [
      'participantJoined',
      'tournamentStarted',
      'tournamentUpdated',
      'notification'
    ] as const;
    
    events.forEach(event => {
      if (event in this.boundEventHandlers) {
        document.removeEventListener(event, this.boundEventHandlers[event]);
      }
    });
    
    this.boundEventHandlers = {};
  }

  private async loadData(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.tournamentService.getTournamentDetails(this.tournamentId);
      
      if (response.success) {
        this.tournament = response.tournament || null;
        this.matches = response.matches || [];
        this.participants = response.participants || [];
        const userId = parseInt(sessionStorage.getItem('userId') || '0');
        this.isRegistered = this.participants.some(p => p.id === userId);
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Failed to load tournament details' };
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      return { success: false, error: 'An error occurred while loading tournament details.' };
    }
  }

  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 min-h-screen';    
    container.addEventListener('click', this.handleClick.bind(this));
    
    container.innerHTML = `
      <div class="flex justify-center items-center h-64">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-16 w-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-6 text-pink-600 dark:text-pink-400 font-medium text-lg">Loading tournament details...</p>
        </div>
      </div>
    `;
    
    const result = await this.loadData();
    if (result.success) {
      this.renderContent(container);
    } else {
      this.renderError(container, result.error || 'Failed to load tournament details');
    }
    
    this.setupDataEventListeners();    
    this.element = container;
    return container;
  }
  
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    
    if (target.id === 'register-btn' || target.closest('#register-btn')) {
      e.preventDefault();
      this.showRegistrationModal();
      return;
    }
    
    const joinMatchButton = target.classList.contains('join-match') 
      ? target 
      : target.closest('.join-match');
      
    if (joinMatchButton) {
      e.preventDefault();
      const matchId = parseInt(joinMatchButton.getAttribute('data-id') || '0');
      if (matchId) {
        this.joinMatch(matchId);
      }
      return;
    }
    
    const submitButton = target.id === 'submit-registration' || target.closest('#submit-registration');
    if (submitButton) {
      e.preventDefault();

      const form = document.getElementById('registration-form') as HTMLFormElement;
      if (form) {
        const aliasInput = form.querySelector('#alias') as HTMLInputElement;
        const alias = aliasInput?.value.trim();
        
        if (alias) {
          this.registerForTournament(alias);
          const modal = document.getElementById('registration-modal');
          if (modal) modal.remove();
        }
      }
    }
  }

  private showRegistrationModal(): void {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50';
    modalOverlay.id = 'registration-modal';
    
    modalOverlay.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all animate-fadeIn">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">Tournament Registration</h3>
          <button type="button" id="close-modal" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p class="text-gray-600 dark:text-gray-300 mb-6">Please choose an alias.</p>
        
        <form id="registration-form" class="space-y-5">
          <div class="relative">
            <div class="relative flex justify-start">
              <input type="text" id="alias" name="alias" maxlength="20" required
                  class="pl-10 block w-2/3 h-12 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter something fun">
            </div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">This is how other players will see you during the tournament.</p>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button type="button" id="cancel-registration" class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
              Cancel
            </button>
            <button type="submit" id="submit-registration" class="px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-lg hover:from-pink-700 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 shadow-lg transition-all transform hover:translate-y-0.5">
              Register
            </button>
          </div>
        </form>
      </div>
    `;
    
    modalOverlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target === modalOverlay || target.id === 'close-modal' || target.closest('#close-modal')) {
        modalOverlay.classList.add('animate-fadeOut');
        setTimeout(() => modalOverlay.remove(), 200);
        return;
      }
      
      if (target.id === 'cancel-registration' || target.closest('#cancel-registration')) {
        modalOverlay.classList.add('animate-fadeOut');
        setTimeout(() => modalOverlay.remove(), 200);
        return;
      }
      
      if (target.id === 'submit-registration' || target.closest('#submit-registration')) {
        const form = document.getElementById('registration-form') as HTMLFormElement;
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const aliasInput = form.querySelector('#alias') as HTMLInputElement;
            const alias = aliasInput?.value.trim();

            if (alias) {
              this.registerForTournament(alias);
              modalOverlay.classList.add('animate-fadeOut');
              setTimeout(() => modalOverlay.remove(), 200);
            }
          });
        }
        return;
      }
    });
    
    if (!document.getElementById('tournament-animations')) {
      const style = document.createElement('style');
      style.id = 'tournament-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fadeOut { animation: fadeOut 0.2s ease-in forwards; }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(modalOverlay);
  }
  
  private async registerForTournament(alias: string): Promise<void> {
    try {
      if (!alias || alias.trim() === '') {
        this.showNotification('Alias cannot be empty', 'error');
        return;
      }
      if (alias.length < 3 || alias.length > 20) {
        this.showNotification('Alias must be between 3 and 20 characters', 'error');
        return;
      }
      
      const response = await this.tournamentService.registerForTournament(this.tournamentId, alias);
      
      if (response.success) {
        this.isRegistered = true;
        
        if (response.tournament_started) {
          this.showNotification('Tournament has started! The bracket is now available.', 'success');
          
          const event = new CustomEvent('tournamentStarted', {
            detail: { tournament: { ...this.tournament, status: 'active' } }
          });
          document.dispatchEvent(event);
        } else {
          this.showNotification(response.message || 'Successfully registered for tournament', 'success');
          
          const userId = parseInt(sessionStorage.getItem('userId') || '0');
          const userName = sessionStorage.getItem('username') || 'User';
          
          const newParticipant = {
            id: userId,
            username: userName,
            alias: alias,
            status: 'active'
          };
          
          this.participants.push(newParticipant);          
          const event = new CustomEvent('participantJoined', {
            detail: { participant: newParticipant }
          });
          document.dispatchEvent(event);
        }        
        await this.update();
      } else {
        this.showNotification(response.error || 'Failed to register for tournament', 'error');
      }
    } catch (error) {
      console.error('Error registering for tournament:', error);
      this.showNotification('An error occurred while registering for the tournament', 'error');
    }
  }
  
  private async joinMatch(matchId: number): Promise<void> {
    try {
      const response = await this.tournamentService.joinTournamentMatch(matchId);
      if (response.success && response.gameId) {
        const userId = parseInt(sessionStorage.getItem('userId') || '0');
        const success = await this.router.getWsManager().connectGame(response.gameId, userId);
        if (!success) {
          this.showNotification('Failed to connect to game room.', 'error');
        }
        this.router.navigateTo(`/play`);
      } else {
        this.showNotification(response.error || 'Failed to join match', 'error');
      }
    } catch (error) {
      console.error('Error joining match:', error);
      this.showNotification('An error occurred while joining the match', 'error');
    }
  }
  
  private renderError(container: HTMLElement, message: string): void {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-96">
        <div class="rounded-full bg-red-100 p-4 text-red-500 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
        <p class="text-gray-600 dark:text-gray-400 text-center max-w-md">${message}</p>
        <button 
          class="mt-6 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    `;
  }

  public showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const duration = type === 'error' ? 8000 : 5000;
    Notifications.show(type, message, duration);
  }

  public renderContent(container: HTMLElement): void {
    if (!this.tournament) return;
    
    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
        <!-- Tournament header -->
        <div class="bg-gradient-to-r from-pink-600 to-pink-400 text-white p-8 relative overflow-hidden">
          <div class="absolute inset-0 overflow-hidden opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="1"/>
                </pattern>
                <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                  <rect width="80" height="80" fill="url(#smallGrid)"/>
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" stroke-width="2"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          <div class="relative flex flex-col items-center">
            <h1 id="tournament-title" class="text-4xl font-bold text-center text-shadow-sm">${this.tournament.name}</h1>
            <p id="tournament-description" class="mt-4 text-pink-100 text-center max-w-2xl text-lg">${this.tournament.description || 'No description available.'}</p>
            
            <div id="registration-button-container">
              ${this.renderRegistrationButton()}
            </div>
          </div>
        </div>
        
        <!-- Tournament content -->
        <div class="p-8">
          <div class="flex flex-col lg:flex-row gap-8">
            <!-- Tournament bracket -->
            <div id="tournament-bracket-container" class="lg:w-2/3">
              <div class="flex items-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-600 dark:text-pink-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Tournament Bracket</h2>
              </div>
              ${this.renderBracket()}
            </div>
            
            <!-- Participants list -->
            <div id="tournament-players-section" class="lg:w-1/3">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-600 dark:text-pink-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Players</h2>
                </div>
                <span id="tournament-player-count" class="bg-pink-100 text-pink-800 text-sm font-medium px-3 py-1 rounded-full dark:bg-pink-900 dark:text-pink-200">
                  ${this.tournament.current_participants || 0} / 4
                </span>
              </div>
              <div id="tournament-participants-container">
                ${this.renderParticipants()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tournament rules -->
      <div id="tournament-rules" class="mt-8 bg-white dark:bg-gray-800 shadow-lg rounded-2xl overflow-hidden">
        <div class="p-6">
          <div class="flex items-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-600 dark:text-pink-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Tournament Rules</h2>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
              <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Format
              </h3>
              <p class="text-gray-600 dark:text-gray-300">Single elimination bracket. Winners advance to the next round.</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
              <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Match Start
              </h3>
              <p class="text-gray-600 dark:text-gray-300">Each match begins as soon as both players join.</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
              <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Fair Play
              </h3>
              <p class="text-gray-600 dark:text-gray-300">Unsportsmanlike conduct will result in disqualification.</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
              <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Scoring
              </h3>
              <p class="text-gray-600 dark:text-gray-300">First player to 5 points wins the match.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderRegistrationButton(): string {
    if (this.tournament?.status !== 'pending') {
      return '';
    }
    
    if (this.isRegistered) {
      const userId = parseInt(sessionStorage.getItem('userId') || '0');
      const userParticipant = this.participants.find(p => p.id === userId);
      const userAlias = userParticipant?.alias || '';
      
      return `
        <div class="mt-8 flex flex-col items-center">
          <span class="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            You are registered
          </span>
          ${userAlias ? `<p class="text-green-100 mt-2 text-lg font-medium">Your tournament alias: <strong>${userAlias}</strong></p>` : ''}
        </div>
      `;
    } else {
      const isFull = (this.tournament?.current_participants || 0) >= 4;
      
      if (isFull) {
        return `
          <div class="mt-8">
            <button disabled class="px-6 py-3 bg-gray-400 text-white font-medium rounded-lg shadow opacity-75 cursor-not-allowed flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Tournament Full
            </button>
          </div>
        `;
      }
      
      return `
        <div class="mt-8 transform hover:scale-105 transition duration-300">
          <button id="register-btn" class="px-8 py-4 bg-white text-pink-600 font-bold rounded-lg shadow-md hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 flex items-center group">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Register for Tournament
          </button>
        </div>
      `;
    }
  }
  
  public renderBracket(): string {
    if (this.matches.length === 0) {
      return `
        <div id="tournament-bracket" class="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-10 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-gray-400 dark:text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Bracket Not Available Yet</h3>
          <p class="text-gray-600 dark:text-gray-300">The tournament bracket will be available once the tournament starts.</p>
        </div>
      `;
    }
    
    const roundsMap = new Map<number, TournamentMatch[]>();
    this.matches.forEach(match => {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round)!.push(match);
    });
    
    const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
    
    return `
      <div id="tournament-bracket" class="tournament-bracket overflow-x-auto pb-6">
        <div class="flex space-x-10">
          ${rounds.map((round, roundIndex) => `
            <div id="tournament-round-${round}" class="flex-shrink-0 w-80">
              <div class="bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-900/10 rounded-lg p-4 mb-6">
                <h3 class="text-lg font-semibold text-pink-700 dark:text-pink-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  ${round === 1 ? 'Semifinals' : 'Finals'}
                </h3>
              </div>
              <div class="space-y-8">
                ${roundsMap.get(round)!.map((match, matchIndex) => `
                  <div id="tournament-match-${match.id}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md overflow-hidden transform transition hover:shadow-lg">
                    ${this.renderMatchContent(match)}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
private renderMatchContent(match: TournamentMatch): string {
  const player1Name = match.player1_alias || match.player1_username || 'TBD';
  const player2Name = match.player2_alias || match.player2_username || 'TBD';
  
  const player1Class = match.winner_id === match.player1_id ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300' : '';
  const player2Class = match.winner_id === match.player2_id ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300' : '';
  
  const userId = parseInt(sessionStorage.getItem('userId') || '0');
  const userInMatch = match.player1_id === userId || match.player2_id === userId;
  const matchIsPlayable = userInMatch && (match.status === 'scheduled' || match.status === 'in_progress');

  const statusColors = {
    scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };
  
  const statusClass = statusColors[match.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  
  return `
    <div class="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3 flex justify-between items-center">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Match #${match.match_number}</span>
      <span class="text-xs px-2 py-1 rounded-full ${statusClass} font-medium">
        ${this.formatMatchStatus(match.status)}
      </span>
    </div>
    
    <div class="p-5">
      <div class="mb-4">
        <div class="border ${player1Class} rounded-lg p-3 flex justify-between items-center dark:border-gray-700 transition-all duration-200 hover:shadow-sm">
          <div class="flex items-center">
            <div class="h-10 w-10 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center font-medium mr-3 shadow-sm">
              ${player1Name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="font-medium dark:text-white">${player1Name}</span>
              ${userId === match.player1_id ? '<span class="ml-2 text-xs text-pink-600 dark:text-pink-400 font-medium">You</span>' : ''}
            </div>
          </div>
          ${match.winner_id === match.player1_id ? '<span class="text-green-600 dark:text-green-400 text-sm font-bold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Winner</span>' : ''}
        </div>
      </div>
      
      <div class="flex justify-center items-center my-3">
        <div class="h-px w-16 bg-gray-200 dark:bg-gray-700"></div>
        <div class="mx-3 text-gray-500 dark:text-gray-400 font-medium text-sm">VS</div>
        <div class="h-px w-16 bg-gray-200 dark:bg-gray-700"></div>
      </div>
      
      <div>
        <div class="border ${player2Class} rounded-lg p-3 flex justify-between items-center dark:border-gray-700 transition-all duration-200 hover:shadow-sm">
          <div class="flex items-center">
            <div class="h-10 w-10 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-full flex items-center justify-center font-medium mr-3 shadow-sm">
              ${player2Name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span class="font-medium dark:text-white">${player2Name}</span>
              ${userId === match.player2_id ? '<span class="ml-2 text-xs text-pink-600 dark:text-pink-400 font-medium">You</span>' : ''}
            </div>
          </div>
          ${match.winner_id === match.player2_id ? '<span class="text-green-600 dark:text-green-400 text-sm font-bold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Winner</span>' : ''}
        </div>
      </div>
      
      ${matchIsPlayable ? `
        <div class="mt-5">
          <button class="w-full bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 text-white py-3 px-4 rounded-lg text-sm font-bold shadow-md transition transform hover:translate-y-0.5 join-match flex items-center justify-center" data-id="${match.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Join Match
          </button>
        </div>
      ` : ''}
    </div>
  `;
}
  
  private formatMatchStatus(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
  

public renderParticipants(): string {
  if (this.participants.length === 0) {
    return `
      <div class="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-10 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-gray-400 dark:text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Players Yet</h3>
        <p class="text-gray-600 dark:text-gray-300">Be the first to register for this tournament!</p>
      </div>
    `;
  }
  
  return `
    <div id="tournament-participants-list" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md">
      <ul class="divide-y divide-gray-100 dark:divide-gray-700">
        ${this.participants.map((participant, index) => {
          const isCurrentUser = participant.id === parseInt(sessionStorage.getItem('userId') || '0');
          
          return `
            <li id="participant-${participant.id}" class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${isCurrentUser ? 'bg-pink-50 dark:bg-pink-900/10' : ''}">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <div>
                    <div class="flex items-center">
                      <p class="font-medium text-gray-900 dark:text-white">${participant.alias}</p>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  ${participant.status === 'winner' ? 
                    `<span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full mb-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Champion
                    </span>` : ''}
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Rank #${index + 1}</span>
                  </div>
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

 setTournamentId(id: string): void {
    this.tournamentId = id;
    this.element = null;    
    this.setupMessageHandlers();
  }

  async update(): Promise<void> {    
    if (!this.element) {
      await this.render();
      return;
    }
    
    const result = await this.loadData();    
    if (!result.success) {
      this.renderError(this.element, result.error || 'Failed to load tournament details');
      return;
    }
    
    this.renderContent(this.element);
  }
}