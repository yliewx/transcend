import { Page } from '../types';
import { Router } from '../router';
import { TournamentService, Tournament } from '../services/tournament.service';

export class TournamentPage implements Page {
  private router: Router;
  private tournamentService: TournamentService;
  private element: HTMLElement | null = null;
  private allTournaments: Tournament[] = [];
  private userTournaments: Tournament[] = [];
  private activeTab: 'all' | 'my' | 'admin' = 'all';

  constructor(router: Router) {
    this.router = router;
    this.tournamentService = new TournamentService();
  }

  async render(): Promise<HTMLElement> {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    // Initial empty state
    container.innerHTML = this.renderTabs() + `
      <div class="px-4 py-6 sm:px-0">
        <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
          <div class="text-center">
            <p class="text-gray-500 dark:text-gray-400">Select a tab to view tournaments</p>
          </div>
        </div>
      </div>
    `;
    
    this.element = container;
    
    // Set up event delegation for the entire container
    this.setupEventDelegation(container);
    
    // Initial data load
    this.loadData();
    
    return container;
  }
  
  update(): void {
    this.activeTab = 'all'; // Reset to default tab
    this.loadData();
  }
  
  destroy(): void {
   
  }

  // Data Loading and UI Update Methods
  private async loadData(): Promise<void> {
    try {
      // Only load data relevant to the current tab
      if (this.activeTab === 'all') {
        const allResponse = await this.tournamentService.getTournaments();
        if (allResponse.success && allResponse.tournaments) {
          this.allTournaments = allResponse.tournaments;
        }
      }

      if (this.activeTab === 'my') {
        const userResponse = await this.tournamentService.getUserTournaments();
        if (userResponse.success && userResponse.tournaments) {
          this.userTournaments = userResponse.tournaments;
        }
      }

      // Update UI with fresh data
      this.updateUI();
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      
      if (this.element) {
        const contentContainer = this.element.querySelector('.px-4.py-6');
        if (contentContainer) {
          contentContainer.innerHTML = `
            <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
              <div class="text-center py-8">
                <p class="text-red-500">An error occurred while loading tournaments.</p>
                <button id="retry-btn" class="mt-4 btn-primary">
                  Retry
                </button>
              </div>
            </div>
          `;
        }
      }
    }
  }

  private updateUI(): void {
    if (!this.element) return;

    // Update tabs UI
    this.element.querySelector('nav')?.parentElement?.replaceWith(
      document.createRange().createContextualFragment(this.renderTabs())
    );

    // Main content container
    const contentContainer = this.element.querySelector('.px-4.py-6');
    if (!contentContainer) return;

    // Render content based on active tab
    switch (this.activeTab) {
      case 'all':
        contentContainer.innerHTML = this.renderAllTournamentsContent();
        break;
      case 'my':
        contentContainer.innerHTML = this.renderMyTournamentsContent();
        break;
      case 'admin':
        contentContainer.innerHTML = this.renderAdminContent();
        break;
    }
  }

  // Event Handling Methods
  private setupEventDelegation(container: HTMLElement): void {
    // Handle all click events through delegation
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Handle tab clicks
      if (target.closest('.tab-link')) {
        e.preventDefault();
        const tabLink = target.closest('.tab-link') as HTMLElement;
        const tabName = tabLink.dataset.tab as 'all' | 'my' | 'admin';
        
        if (tabName && tabName !== this.activeTab) {
          this.activeTab = tabName;
          // First fetch fresh data, then update UI
          this.loadData();
        }
        return;
      }
      
      // Handle view details button clicks
      if (target.closest('.view-details')) {
        const button = target.closest('.view-details') as HTMLElement;
        const tournamentId = button.dataset.id;
        
        if (tournamentId) {
          this.router.navigateTo(`/tournaments/${tournamentId}`);
        }
        return;
      }
      
      // Handle form submission for creating tournaments
      if (target.closest('button[type="submit"]') && 
          target.closest('#create-tournament-form')) {
        const form = target.closest('#create-tournament-form') as HTMLFormElement;
        if (form) {
          // Prevent default here, but handle the actual submission in handleFormSubmit
          e.preventDefault();
          this.handleCreateTournament(e);
        }
        return;
      }
      
      // Handle retry button click
      if (target.closest('#retry-btn')) {
        e.preventDefault();
        this.loadData();
        return;
      }
    });
  }

  private async handleCreateTournament(e: Event): Promise<void> {
    const form = e.target ? (e.target as Element).closest('#create-tournament-form') as HTMLFormElement : null;
    if (!form) return;
    
    const nameInput = form.querySelector('#name') as HTMLInputElement;
    const descriptionInput = form.querySelector('#description') as HTMLTextAreaElement;
    
    // Validate name is provided
    if (!nameInput?.value?.trim()) {
      alert('Please provide a tournament name');
      return;
    }
    
    // Create tournament with simplified data
    const tournamentData = {
      name: nameInput.value,
      description: descriptionInput?.value || 'No description provided',
      max_participants: 4 // Fixed at 4 participants
    };
    
    try {
      // Show loading state
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (!submitButton) return;
      
      const originalButtonText = submitButton.textContent || 'Create Tournament';
      submitButton.textContent = 'Creating...';
      submitButton.disabled = true;
      
      const data = await this.tournamentService.createTournament(tournamentData);
      
      if (data.success) {
        // Reset form
        form.reset();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded mt-4';
        successMessage.textContent = 'Tournament created successfully! Players can now join.';
        
        form.appendChild(successMessage);
        
        // Remove the message after 5 seconds
        setTimeout(() => {
          successMessage.remove();
        }, 5000);
        
        // Reload data
        this.loadData();
      } else {
        alert(data.error || 'Failed to create tournament');
      }
      
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('An error occurred while creating the tournament');
      
      // Also reset button state on error
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.textContent = 'Create Tournament';
        submitButton.disabled = false;
      }
    }
  }

  // UI Rendering Methods
  private renderTabs(): string {
    return `
      <div class="px-4 sm:px-0">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="-mb-px flex" aria-label="Tabs">
            <a 
              href="#" 
              class="tab-link ${this.activeTab === 'all' ? 'border-pink-600 text-pink-600 dark:text-pink-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'} w-1/3 py-4 px-1 text-center border-b-2 font-medium text-base md:text-lg" 
              data-tab="all"
            >
              Browse
            </a>
            <a 
              href="#" 
              class="tab-link ${this.activeTab === 'my' ? 'border-pink-600 text-pink-600 dark:text-pink-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'} w-1/3 py-4 px-1 text-center border-b-2 font-medium text-base md:text-lg" 
              data-tab="my"
            >
              Joined
            </a>
            <a 
              href="#" 
              class="tab-link ${this.activeTab === 'admin' ? 'border-pink-600 text-pink-600 dark:text-pink-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'} w-1/3 py-4 px-1 text-center border-b-2 font-medium text-base md:text-lg" 
              data-tab="admin"
            >
              Create
            </a>
          </nav>
        </div>
      </div>
    `;
  }

  private renderAllTournamentsContent(): string {
    return `
      <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Available Tournaments</h1>
        </div>
        
        ${this.renderTournamentList(this.allTournaments)}
      </div>
    `;
  }

  private renderMyTournamentsContent(): string {
    return `
      <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Registered Tournaments</h1>
        </div>
        
        ${this.renderTournamentList(this.userTournaments, true)}
      </div>
    `;
  }

  private renderAdminContent(): string {
    return `
      <div class="dark:bg-gray-900 shadow-md rounded-lg p-8">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Tournament</h1>
        </div>
        
        <div class="mb-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>How tournaments work:</strong>
          </p>
          <ul class="list-disc pl-5 mt-2 text-sm text-blue-800 dark:text-blue-200">
            <li>All tournaments have exactly 4 participants</li>
            <li>Tournaments automatically start once 4 players have joined</li>
            <li>Create as many tournaments as you need</li>
          </ul>
        </div>
        
        <div class="mb-8">
          <form id="create-tournament-form" class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tournament Name</label>
              <input type="text" id="name" required class="input-field">
            </div>
            
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea id="description" rows="3" class="input-field"></textarea>
            </div>
            
            <div>
              <button type="submit" class="card-button">
                Create Tournament
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private renderTournamentList(tournaments: Tournament[], isUserTournaments: boolean = false): string {
    if (tournaments.length === 0) {
      return isUserTournaments 
        ? `
          <div class="text-center py-8">
            <p class="text-gray-500 dark:text-gray-400">You haven't joined any tournaments yet.</p>
            <p class="text-gray-500 dark:text-gray-400 mt-2">Check out the available tournaments to get started!</p>
          </div>
        `
        : `
          <div class="text-center py-8">
            <p class="text-gray-500 dark:text-gray-400">No tournaments available at the moment.</p>
          </div>
        `;
    }
    
    return `
      <div class="grid grid-cols-1 gap-4 mt-4">
        ${tournaments.map(tournament => this.renderTournamentCard(tournament, isUserTournaments)).join('')}
      </div>
    `;
  }

  private renderTournamentCard(tournament: Tournament, isUserTournament: boolean = false): string {
    return `
      <div class="card hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start">
          <div class="text-left">
            <h3 class="card-title">${tournament.name}</h3>
            <p class="card-description">${tournament.description || 'No description available'}</p>
            
            <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <div><span class="font-medium">Status:</span> ${this.formatStatus(tournament.status)}</div>
              ${isUserTournament && tournament.participant_status ? 
                `<div><span class="font-medium">Your Status:</span> ${this.formatParticipantStatus(tournament.participant_status)}</div>` 
                : ''}
              <div><span class="font-medium">Participants:</span> ${tournament.current_participants || 0} / 4</div>
            </div>
          </div>
          
          <div>
            <button 
              class="view-details card-button"
              data-id="${tournament.id}"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Helper Methods
  private formatStatus(status: string): string {
    switch (status) {
      case 'pending':
        return '<span class="text-green-600 dark:text-green-400 font-medium">Registration Open</span>';
      case 'active':
        return '<span class="text-yellow-600 dark:text-yellow-400 font-medium">In Progress</span>';
      case 'completed':
        return '<span class="text-blue-600 dark:text-blue-400 font-medium">Completed</span>';
      case 'cancelled':
        return '<span class="text-red-600 dark:text-red-400 font-medium">Cancelled</span>';
      default:
        return status;
    }
  }

  private formatParticipantStatus(status: string): string {
    switch (status) {
      case 'registered':
        return '<span class="text-green-600 dark:text-green-400 font-medium">Registered</span>';
      case 'active':
        return '<span class="text-yellow-600 dark:text-yellow-400 font-medium">Active</span>';
      case 'eliminated':
        return '<span class="text-red-600 dark:text-red-400 font-medium">Eliminated</span>';
      case 'winner':
        return '<span class="text-blue-600 dark:text-blue-400 font-medium">Winner! 🏆</span>';
      default:
        return status;
    }
  }
}