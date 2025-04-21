import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament } from '../services/tournament.service';

export class UserTournamentsPage implements Page {
  private router: Router;
  private tournamentService: TournamentService;
  private element: HTMLElement | null = null;
  private tournaments: Tournament[] = [];
  
  constructor(router: Router) {
    this.router = router;
    this.tournamentService = new TournamentService();
  }
  
  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    // Placeholder while loading
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="text-center">
            <p class="text-gray-500">Loading your tournaments...</p>
          </div>
        </div>
      </div>
    `;
    
    // Fetch user's tournaments
    try {
      const response = await this.tournamentService.getUserTournaments();
      if (response.success && response.tournaments) {
        this.tournaments = response.tournaments;
        this.renderContent(container);
      } else {
        container.innerHTML = `
          <div class="px-4 py-6 sm:px-0">
            <div class="bg-white shadow-md rounded-lg p-8">
              <div class="text-center">
                <p class="text-red-500">${response.error || 'Failed to load your tournaments'}</p>
                <button id="browse-btn" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Browse All Tournaments
                </button>
              </div>
            </div>
          </div>
        `;
        
        document.getElementById('browse-btn')?.addEventListener('click', () => {
          this.router.navigateTo('/tournaments');
        });
      }
    } catch (error) {
      console.error('Error fetching user tournaments:', error);
      container.innerHTML = `
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow-md rounded-lg p-8">
            <div class="text-center">
              <p class="text-red-500">An error occurred while loading your tournaments.</p>
              <button id="browse-btn" class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                Browse All Tournaments
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.getElementById('browse-btn')?.addEventListener('click', () => {
        this.router.navigateTo('/tournaments');
      });
    }
    
    this.element = container;
    return container;
  }
  
  private renderContent(container: HTMLElement): void {
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">My Tournaments</h1>
            <button id="browse-btn" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              Browse All Tournaments
            </button>
          </div>
          
          ${this.renderTournamentList()}
        </div>
      </div>
    `;
    
    this.addEventListeners();
  }
  
  private renderTournamentList(): string {
    if (this.tournaments.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-500">You haven't joined any tournaments yet.</p>
          <p class="text-gray-500 mt-2">Browse available tournaments to get started!</p>
        </div>
      `;
    }
    
    return `
      <div class="grid grid-cols-1 gap-4 mt-4">
        ${this.tournaments.map(tournament => `
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-semibold">${tournament.name}</h3>
                <p class="text-sm text-gray-500">${tournament.description || 'No description available'}</p>
                
                <div class="mt-2 text-sm">
                  <div><span class="font-medium">Status:</span> ${this.formatStatus(tournament.status)}</div>
                  <div><span class="font-medium">Your Status:</span> ${this.formatParticipantStatus(tournament.participant_status)}</div>
                  <div><span class="font-medium">Starts:</span> ${new Date(tournament.start_date).toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <button 
                  class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 view-details"
                  data-id="${tournament.id}"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        `).join('')}
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
  
  private formatParticipantStatus(status: string): string {
    switch (status) {
      case 'registered':
        return '<span class="text-blue-600 font-medium">Registered</span>';
      case 'active':
        return '<span class="text-green-600 font-medium">Active</span>';
      case 'eliminated':
        return '<span class="text-red-600 font-medium">Eliminated</span>';
      case 'winner':
        return '<span class="text-yellow-600 font-medium">Winner! 🏆</span>';
      default:
        return status;
    }
  }
  
  private addEventListeners(): void {
    // Browse button
    document.getElementById('browse-btn')?.addEventListener('click', () => {
      this.router.navigateTo('/tournaments');
    });
    
    // View details buttons
    document.querySelectorAll('.view-details').forEach(button => {
      button.addEventListener('click', (e) => {
        const tournamentId = (e.currentTarget as HTMLElement).dataset.id;
        if (tournamentId) {
          this.router.navigateTo(`/tournaments/${tournamentId}`);
        }
      });
    });
  }
  
  update(): void {
    // Re-render to get latest data
    this.element = null;
    this.render();
  }
  
  destroy(): void {
    // Clean up any resources
    this.element = null;
  }
}