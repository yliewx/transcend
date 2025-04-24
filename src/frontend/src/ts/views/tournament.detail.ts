import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament, TournamentMatch, TournamentParticipant } from '../services/tournament.service';

export class TournamentDetailPage implements Page {
  private router: Router;
  private tournamentService: TournamentService;
  private element: HTMLElement | null = null;
  private tournament: Tournament | null = null;
  private matches: TournamentMatch[] = [];
  private participants: TournamentParticipant[] = [];
  private tournamentId: string | null = null;
  private isRegistered: boolean = false;
  
  constructor(router: Router) {
    this.router = router;
    this.tournamentService = new TournamentService();
  }

  // Load tournament data
  private async loadData(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Fetching tournament details for ID:', this.tournamentId);
      const response = await this.tournamentService.getTournamentDetails(this.tournamentId);
      
      if (response.success) {
        this.tournament = response.tournament || null;
        this.matches = response.matches || [];
        this.participants = response.participants || [];
        
        // Check if user is registered
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
    container.className = 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen';
    
    // Add a single event listener for all clicks using event delegation
    container.addEventListener('click', this.handleClick.bind(this));
    
    // Placeholder while loading
    container.innerHTML = `
      <div class="flex justify-center items-center h-64">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="mt-4 text-indigo-600 font-medium">Loading tournament details...</p>
        </div>
      </div>
    `;
    
    // Load data
    const result = await this.loadData();
    
    if (result.success) {
      this.renderContent(container);
    } else {
      this.renderError(container, result.error || 'Failed to load tournament details');
    }
    
    this.element = container;
    return container;
  }
  
  // Handle all click events with a single event handler
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    
    // Register button
    if (target.id === 'register-btn' || target.closest('#register-btn')) {
      e.preventDefault();
      this.showRegistrationModal();
      return;
    }
    
    // Join match button
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
    
    // Modal close button
    // if (target.id === 'close-modal' || target.closest('#close-modal')) {
    //   const modal = document.getElementById('registration-modal');
    //   if (modal) modal.remove();
    //   return;
    // }
    
    // // Cancel registration button
    // if (target.id === 'cancel-registration' || target.closest('#cancel-registration')) {
    //   const modal = document.getElementById('registration-modal');
    //   if (modal) modal.remove();
    //   return;
    // }
    
    // Notification close button
    const notificationButton = target.closest('.notification button');
    if (notificationButton) {
      const notification = target.closest('.notification');
      if (notification) notification.remove();
      return;
    }
    
    const submitButton = target.id === 'submit-registration' || target.closest('#submit-registration');
    if (submitButton) {
      e.preventDefault();
      // Find the form in the DOM instead of trying to traverse from the button
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
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modalOverlay.id = 'registration-modal';
  
  // Create modal content
  modalOverlay.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl transform transition-all">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900">Tournament Registration</h3>
        <button type="button" id="close-modal" class="text-gray-400 hover:text-gray-500">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Please choose an alias.</p>
      
      <form id="registration-form" class="space-y-4">
        <div>
          <input type="text" id="alias" name="alias" required
                 class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                 placeholder="Enter something fun">
          <p class="mt-1 text-sm text-gray-500">This is how other players will see you during the tournament.</p>
        </div>
        
        <div class="flex justify-end">
          <button type="button" id="cancel-registration" class="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </button>
          <button type="button" id="submit-registration" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Register
          </button>
        </div>
      </form>
    </div>
  `;
  
  modalOverlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Close modal
    if (target.id === 'close-modal' || target.closest('#close-modal')) {
      modalOverlay.remove();
      return;
    }
    
    // Cancel button
    if (target.id === 'cancel-registration' || target.closest('#cancel-registration')) {
      modalOverlay.remove();
      return;
    }
    
    // Submit registration
    if (target.id === 'submit-registration' || target.closest('#submit-registration')) {
      const form = document.getElementById('registration-form') as HTMLFormElement;
      if (form) {
        const aliasInput = form.querySelector('#alias') as HTMLInputElement;
        const alias = aliasInput?.value.trim();
        
        if (alias) {
          this.registerForTournament(alias);
          modalOverlay.remove();
        }
      }
      return;
    }
  });
  
  document.body.appendChild(modalOverlay);
}
  
  private async registerForTournament(alias: string): Promise<void> {
    try {
      console.log('Registering for tournament:', this.tournamentId, 'with alias:', alias);
      const response = await this.tournamentService.registerForTournament(this.tournamentId, alias);
      
      if (response.success) {
        this.isRegistered = true;
        
        // If tournament started immediately, show a special notification
        if (response.tournament_started) {
          this.showNotification('Tournament has started! The bracket is now available.', 'success');
        } else {
          this.showNotification(response.message || 'Successfully registered for tournament', 'success');
        }
        
        // Call update immediately to refresh the UI
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
      console.log('Joining match:', matchId);
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
      <div class="flex flex-col items-center justify-center h-64">
        <div class="rounded-full bg-red-100 p-3 text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-red-600 font-medium">${message}</p>
      </div>
    `;
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notificationContainer = document.getElementById('notification-container') || this.createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white px-4 py-3 rounded shadow-lg flex items-center justify-between`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="ml-4 focus:outline-none">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    
    // No need to add individual event listeners - we're using delegation
    
    notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  private createNotificationContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
    return container;
  }
  
  private renderContent(container: HTMLElement): void {
    if (!this.tournament) return;
    
    container.innerHTML = `
      <div class="bg-white shadow-lg rounded-xl overflow-hidden">
        <!-- Tournament header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
          <div class="flex flex-col items-center">
            <h1 class="text-4xl font-bold text-center">${this.tournament.name}</h1>
            <p class="mt-2 text-indigo-100 text-center max-w-2xl">${this.tournament.description || 'No description available.'}</p>
            
            ${this.renderRegistrationButton()}
          </div>
        </div>
        
        <!-- Tournament content -->
        <div class="p-6">
          <div class="flex flex-col lg:flex-row gap-8">
            <!-- Tournament bracket -->
            <div class="lg:w-2/3">
              <div class="flex items-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 class="text-2xl font-bold text-gray-800">Tournament Bracket</h2>
              </div>
              ${this.renderBracket()}
            </div>
            
            <!-- Participants list -->
            <div class="lg:w-1/3">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 class="text-2xl font-bold text-gray-800">Participants</h2>
                </div>
                <span class="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                  ${this.tournament.current_participants || 0} / 4
                </span>
              </div>
              ${this.renderParticipants()}
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
      // Find user's alias in the participant list
      const userId = parseInt(sessionStorage.getItem('userId') || '0');
      const userParticipant = this.participants.find(p => p.id === userId);
      const userAlias = userParticipant?.alias || '';
      
      return `
        <div class="mt-6 flex flex-col items-center">
          <span class="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            You are registered
          </span>
          ${userAlias ? `<p class="text-green-100 mt-2">Your tournament alias: <strong>${userAlias}</strong></p>` : ''}
        </div>
      `;
    } else {
      const isFull = (this.tournament?.current_participants || 0) >= 4;
      
      if (isFull) {
        return `
          <div class="mt-6">
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
        <div class="mt-6">
          <button id="register-btn" class="px-6 py-3 bg-white text-indigo-600 font-medium rounded-lg shadow hover:bg-indigo-50 transform transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Register for Tournament
          </button>
        </div>
      `;
    }
  }
  
  private renderBracket(): string {
    if (this.matches.length === 0) {
      return `
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-gray-600">Tournament bracket will be available once the tournament starts.</p>
        </div>
      `;
    }
    
    // Group matches by round
    const roundsMap = new Map<number, TournamentMatch[]>();
    this.matches.forEach(match => {
      if (!roundsMap.has(match.round)) {
        roundsMap.set(match.round, []);
      }
      roundsMap.get(match.round)!.push(match);
    });
    
    const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
    
    return `
      <div class="tournament-bracket overflow-x-auto pb-4">
        <div class="flex space-x-8">
          ${rounds.map(round => `
            <div class="flex-shrink-0 w-72">
              <div class="bg-indigo-50 rounded-lg p-3 mb-4">
                <h3 class="text-lg font-semibold text-indigo-700">
                  ${round === 1 ? 'Semifinals' : 'Finals'}
                </h3>
              </div>
              <div class="space-y-6">
                ${roundsMap.get(round)!.map(match => this.renderMatch(match)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  private renderMatch(match: TournamentMatch): string {
    // Prefer aliases over usernames if available
    const player1Name = match.player1_alias || match.player1_username || 'TBD';
    const player2Name = match.player2_alias || match.player2_username || 'TBD';
    
    const player1Class = match.winner_id === match.player1_id ? 'bg-green-50 border-green-500 text-green-700' : '';
    const player2Class = match.winner_id === match.player2_id ? 'bg-green-50 border-green-500 text-green-700' : '';
    
    const userId = parseInt(sessionStorage.getItem('userId') || '0');
    const userInMatch = match.player1_id === userId || match.player2_id === userId;
    //const matchIsPlayable = userInMatch && match.player1_id && match.player2_id;
    const matchIsPlayable = userInMatch && (match.status === 'scheduled' || match.status === 'in_progress');

    const statusColors = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const statusClass = statusColors[match.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return `
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="border-b border-gray-100 bg-gray-50 px-4 py-3 flex justify-between items-center">
          <span class="text-sm font-medium text-gray-700">Match #${match.match_number}</span>
          <span class="text-xs px-2 py-1 rounded-full ${statusClass} font-medium">
            ${this.formatMatchStatus(match.status)}
          </span>
        </div>
        
        <div class="p-4">
          <div class="mb-3">
            <div class="border ${player1Class} rounded-lg p-3 flex justify-between items-center">
              <div class="flex items-center">
                <div class="h-8 w-8 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-medium mr-3">
                  ${player1Name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium">${player1Name}</span>
              </div>
              ${match.winner_id === match.player1_id ? '<span class="text-green-600 text-sm font-medium">Winner</span>' : ''}
            </div>
          </div>
          
          <div class="flex justify-center text-gray-400 my-2">VS</div>
          
          <div>
            <div class="border ${player2Class} rounded-lg p-3 flex justify-between items-center">
              <div class="flex items-center">
                <div class="h-8 w-8 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-medium mr-3">
                  ${player2Name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium">${player2Name}</span>
              </div>
              ${match.winner_id === match.player2_id ? '<span class="text-green-600 text-sm font-medium">Winner</span>' : ''}
            </div>
          </div>
          
          ${matchIsPlayable ? `
            <div class="mt-4">
              <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium shadow-sm transition transform hover:scale-105 join-match flex items-center justify-center" data-id="${match.id}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Join Match
              </button>
            </div>
          ` : ''}
        </div>
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
  
  private renderParticipants(): string {
    if (this.participants.length === 0) {
      return `
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p class="text-gray-600">No participants have registered yet.</p>
        </div>
      `;
    }
    
    return `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <ul class="divide-y divide-gray-100">
          ${this.participants.map((participant, index) => `
            <li class="p-4 hover:bg-gray-50">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-medium mr-4">
                    ${participant.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div class="flex items-center">
                      <p class="font-medium text-gray-900">${participant.alias || participant.username}</p>
                      ${participant.alias && participant.alias !== participant.username ? 
                        `<span class="ml-2 text-xs text-gray-500">(${participant.username})</span>` : ''}
                    </div>
                    <p class="text-sm text-gray-500">Rank: ${index + 1}</p>
                  </div>
                </div>
                <div class="flex items-center">
                  ${participant.status === 'winner' ? 
                    `<span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full mr-2">Winner</span>` : ''}
                  <div class="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                    ELO: ${participant.elo || 'N/A'}
                  </div>
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  setTournamentId(id: string): void {
    console.log('Setting tournament ID:', id);
    this.tournamentId = id;
    // Always force a full re-render when the tournament ID changes
    this.element = null;
  }

  async update(): Promise<void> {
    console.log('Updating tournament page, ID:', this.tournamentId);
    
    if (!this.element) {
      // If element doesn't exist yet, just render the whole page
      await this.render();
      return;
    }
    
    // Load the latest data
    const result = await this.loadData();
    
    if (!result.success) {
      // If data loading failed, show error
      this.renderError(this.element, result.error || 'Failed to load tournament details');
      return;
    }
    
    // Simply re-render the entire content
    this.renderContent(this.element);
  }
}