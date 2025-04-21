import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament, TournamentMatch } from '../services/tournament.service';

export class TournamentDetailPage implements Page {
  private router: Router;
  private tournamentService: TournamentService;
  private element: HTMLElement | null = null;
  private tournament: Tournament | null = null;
  private matches: TournamentMatch[] = [];
  private participants: { id: number, username: string, elo: number }[] = [];
  private tournamentId: string | null = null;
  private isRegistered: boolean = false;
  
  constructor(router: Router) {
    this.router = router;
    this.tournamentService = new TournamentService();
  }

  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    // Add a single event listener for all button clicks using event delegation
    container.addEventListener('click', this.handleClick.bind(this));
    
    // Placeholder while loading
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="text-center">
            <p class="text-gray-500">Loading tournament details...</p>
          </div>
        </div>
      </div>
    `;
    
    // Fetch tournament details
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
        
        this.renderContent(container);
      } else {
        container.innerHTML = `
          <div class="px-4 py-6 sm:px-0">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <p class="text-red-500">${response.error || 'Failed to load tournament details'}</p>
                <button id="back-btn" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Back to Tournaments
                </button>
              </div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      container.innerHTML = `
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center">
              <p class="text-red-500">An error occurred while loading tournament details.</p>
              <button id="back-btn" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                Back to Tournaments
              </button>
            </div>
          </div>
        </div>
      `;
    }
    
    this.element = container;
    return container;
  }
  
  // Handle all button clicks with a single event handler
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    
    // Back button
    if (target.id === 'back-btn' || target.closest('#back-btn')) {
      e.preventDefault();
      this.router.navigateTo('/tournaments');
      return;
    }
    
    // Register button
    if (target.id === 'register-btn' || target.closest('#register-btn')) {
      e.preventDefault();
      this.registerForTournament();
      return;
    }
    
    // Unregister button
    if (target.id === 'unregister-btn' || target.closest('#unregister-btn')) {
      e.preventDefault();
      this.unregisterFromTournament();
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
  }
  
  private async registerForTournament(): Promise<void> {
    try {
      console.log('Registering for tournament:', this.tournamentId);
      const response = await this.tournamentService.registerForTournament(this.tournamentId);
      if (response.success) {
        this.isRegistered = true;
        this.update();
      } else {
        alert(response.error || 'Failed to register for tournament');
      }
    } catch (error) {
      console.error('Error registering for tournament:', error);
      alert('An error occurred while registering for the tournament');
    }
  }
  
  private async unregisterFromTournament(): Promise<void> {
    if (confirm('Are you sure you want to unregister from this tournament?')) {
      try {
        console.log('Unregistering from tournament:', this.tournamentId);
        const response = await this.tournamentService.unregisterFromTournament(this.tournamentId);
        if (response.success) {
          this.isRegistered = false;
          this.update();
        } else {
          alert(response.error || 'Failed to unregister from tournament');
        }
      } catch (error) {
        console.error('Error unregistering from tournament:', error);
        alert('An error occurred while unregistering from the tournament');
      }
    }
  }
  
  private async joinMatch(matchId: number): Promise<void> {
    try {
      console.log('Joining match:', matchId);
      const response = await this.tournamentService.joinTournamentMatch(matchId);
      if (response.success && response.gameId) {
        this.router.navigateTo(`/pong/${response.gameId}`);
      } else {
        alert(response.error || 'Failed to join match');
      }
    } catch (error) {
      console.error('Error joining match:', error);
      alert('An error occurred while joining the match');
    }
  }
  
  private renderContent(container: HTMLElement): void {
    if (!this.tournament) return;
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">${this.tournament.name}</h1>
            <button id="back-btn" class="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
              Back
            </button>
          </div>
          
          <div class="mb-8">
            <p class="text-gray-700">${this.tournament.description || 'No description available.'}</p>
            
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="border border-gray-200 rounded p-3">
                <span class="font-medium">Status:</span> ${this.formatStatus(this.tournament.status)}
              </div>
              <div class="border border-gray-200 rounded p-3">
                <span class="font-medium">Start Date:</span> ${new Date(this.tournament.start_date).toLocaleString()}
              </div>
              <div class="border border-gray-200 rounded p-3">
                <span class="font-medium">Participants:</span> ${this.tournament.current_participants || 0}/${this.tournament.max_participants}
              </div>
            </div>
            
            ${this.renderRegistrationButton()}
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 class="text-xl font-semibold mb-4">Tournament Bracket</h2>
              ${this.renderBracket()}
            </div>
            
            <div>
              <h2 class="text-xl font-semibold mb-4">Participants</h2>
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
      return `
        <div class="mt-4">
          <button id="unregister-btn" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Unregister from Tournament
          </button>
          <p class="text-sm text-gray-500 mt-1">You are registered for this tournament.</p>
        </div>
      `;
    } else {
      const isFull = (this.tournament?.current_participants || 0) >= (this.tournament?.max_participants || 0);
      
      if (isFull) {
        return `
          <div class="mt-4">
            <button disabled class="bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed">
              Tournament Full
            </button>
          </div>
        `;
      }
      
      return `
        <div class="mt-4">
          <button id="register-btn" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Register for Tournament
          </button>
        </div>
      `;
    }
  }
  
  private renderBracket(): string {
    if (this.matches.length === 0) {
      return `
        <div class="text-center py-6 border border-gray-200 rounded-lg">
          <p class="text-gray-500">Tournament bracket will be available once the tournament starts.</p>
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
      <div class="tournament-bracket overflow-x-auto">
        <div class="flex space-x-8">
          ${rounds.map(round => `
            <div class="flex-shrink-0 w-64">
              <h3 class="text-lg font-medium mb-3">Round ${round}</h3>
              <div class="space-y-4">
                ${roundsMap.get(round)!.map(match => this.renderMatch(match)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  private renderMatch(match: TournamentMatch): string {
    const player1Name = match.player1_username || 'TBD';
    const player2Name = match.player2_username || 'TBD';
    
    const player1Class = match.winner_id === match.player1_id ? 'bg-green-100 border-green-500' : '';
    const player2Class = match.winner_id === match.player2_id ? 'bg-green-100 border-green-500' : '';
    
    const userId = parseInt(sessionStorage.getItem('userId') || '0');
    const userInMatch = match.player1_id === userId || match.player2_id === userId;
    const matchIsPlayable = match.status === 'scheduled' && userInMatch && match.player1_id && match.player2_id;
    
    return `
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-500">Match #${match.match_number}</span>
          <span class="text-xs px-2 py-1 rounded ${this.getMatchStatusClass(match.status)}">
            ${this.formatMatchStatus(match.status)}
          </span>
        </div>
        
        <div class="space-y-2">
          <div class="border ${player1Class} rounded p-2 flex justify-between">
            <span>${player1Name}</span>
            ${match.winner_id === match.player1_id ? '<span class="text-green-600">Winner</span>' : ''}
          </div>
          
          <div class="border ${player2Class} rounded p-2 flex justify-between">
            <span>${player2Name}</span>
            ${match.winner_id === match.player2_id ? '<span class="text-green-600">Winner</span>' : ''}
          </div>
        </div>
        
        ${matchIsPlayable ? `
          <div class="mt-3">
            <button class="w-full bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 join-match" data-id="${match.id}">
              Join Match
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  private getMatchStatusClass(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div class="text-center py-6 border border-gray-200 rounded-lg">
          <p class="text-gray-500">No participants have registered yet.</p>
        </div>
      `;
    }
    
    return `
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ELO Rating</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${this.participants.map((participant, index) => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">${participant.username}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${participant.elo || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  private formatStatus(status: string): string {
    switch (status) {
      case 'pending':
        return '<span class="text-yellow-600 font-medium">Registration Open</span>';
      case 'active':
        return '<span class="text-green-600 font-medium">In Progress</span>';
      case 'completed':
        return '<span class="text-blue-600 font-medium">Completed</span>';
      case 'cancelled':
        return '<span class="text-red-600 font-medium">Cancelled</span>';
      default:
        return status;
    }
  }

  setTournamentId(id: string): void {
    console.log('Setting tournament ID:', id);
    this.tournamentId = id;
    // Always force a full re-render when the tournament ID changes
    this.element = null;
  }

  update(): void {
    console.log('Updating tournament page, ID:', this.tournamentId);
    // Re-render to get latest data
    this.element = null;
    this.render();
  }
  
  destroy(): void {
    console.log('Destroying tournament page');
    // Clean up any resources
    this.element = null;
  }
}