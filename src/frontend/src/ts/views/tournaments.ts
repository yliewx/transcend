import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament } from '../services/tournament.service';

export class TournamentListPage implements Page {
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
    
    // Fetch tournaments
    try {
      const response = await this.tournamentService.getTournaments();
      if (response.success && response.tournaments) {
        this.tournaments = response.tournaments;
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
    
    // Render the tournaments
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Available Tournaments</h1>
          </div>
          
          ${this.renderTournamentList()}
        </div>
      </div>
    `;
    
    setTimeout(() => {
      this.addEventListeners();
    }, 0);
    
    this.element = container;
    return container;
  }
  
  update(): void {
    // No-op for now
  }
  
  private renderTournamentList(): string {
    if (this.tournaments.length === 0) {
      return `
        <div class="text-center py-8">
          <p class="text-gray-500">No tournaments available at the moment.</p>
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
                  <div><span class="font-medium">Starts:</span> ${new Date(tournament.start_date).toLocaleString()}</div>
                  <div><span class="font-medium">Participants:</span> ${tournament.current_participants || 0}/${tournament.max_participants}</div>
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
  
  private addEventListeners(): void {
    const viewButtons = document.querySelectorAll('.view-details');
    viewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tournamentId = (e.currentTarget as HTMLElement).dataset.id;
        if (tournamentId) {
          this.router.navigateTo(`/tournaments/${tournamentId}`);
        }
      });
    });
  }
  
  destroy(): void {
    // Clean up any resources
    this.element = null;
  }
}