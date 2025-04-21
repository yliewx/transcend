// admin.tournament.page.ts
import { Page } from '../types';
import { Router } from '../router';
import { Tournament } from '../services/tournament.service';

export class AdminTournamentPage implements Page {
  private router: Router;
  private element: HTMLElement | null = null;
  
  constructor(router: Router) {
    this.router = router;
  }
  
  async render(): Promise<HTMLElement> {
    if (this.element) return this.element;
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Tournament Management</h1>
          </div>
          
          <div class="mb-8">
            <h2 class="text-xl font-medium mb-4">Create New Tournament</h2>
            <form id="create-tournament-form" class="space-y-4">
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Tournament Name</label>
                <input type="text" id="name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              </div>
              
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="start_date" class="block text-sm font-medium text-gray-700">Start Date</label>
                  <input type="date" id="start_date" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
                
                <div>
                  <label for="start_time" class="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" id="start_time" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="end_date" class="block text-sm font-medium text-gray-700">End Date</label>
                  <input type="date" id="end_date" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
                
                <div>
                  <label for="end_time" class="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="time" id="end_time" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                </div>
              </div>
              
              <div id="date-error" class="text-red-500 text-sm hidden"></div>
              
              <div>
                <label for="max_participants" class="block text-sm font-medium text-gray-700">Max Participants</label>
                <select id="max_participants" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="4">4</option>
                  <option value="8" selected>8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                </select>
              </div>
              
              <div>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Create Tournament
                </button>
              </div>
            </form>
          </div>
          
          <div>
            <h2 class="text-xl font-medium mb-4">Manage Tournaments</h2>
            <div id="tournaments-list" class="space-y-4">
              <p class="text-gray-500">Loading tournaments...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.element = container;
    
    setTimeout(() => {
      this.setupEventListeners();
      this.loadTournaments();
    }, 0);
    
    return container;
  }
  
  private async loadTournaments(): Promise<void> {
    const tournamentsListElement = document.getElementById('tournaments-list');
    if (!tournamentsListElement) return;
    
    try {
      const response = await fetch('/api/admin/tournaments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.tournaments) {
        if (data.tournaments.length === 0) {
          tournamentsListElement.innerHTML = `
            <p class="text-gray-500">No tournaments found.</p>
          `;
          return;
        }
        
        tournamentsListElement.innerHTML = `
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${data.tournaments.map((tournament: Tournament) => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tournament.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">${tournament.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(tournament.status)}">
                        ${tournament.status}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${tournament.current_participants || 0}/${tournament.max_participants}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${new Date(tournament.start_date).toLocaleDateString()} - ${new Date(tournament.end_date).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button class="text-indigo-600 hover:text-indigo-900 view-tournament" data-id="${tournament.id}">View</button>
                      ${tournament.status === 'pending' ? `
                        <button class="ml-3 text-green-600 hover:text-green-900 start-tournament" data-id="${tournament.id}">Start</button>
                      ` : ''}
                      ${tournament.status !== 'cancelled' ? `
                        <button class="ml-3 text-red-600 hover:text-red-900 cancel-tournament" data-id="${tournament.id}">Cancel</button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        
        this.addTournamentEventListeners();
      } else {
        tournamentsListElement.innerHTML = `
          <p class="text-red-500">${data.error || 'Failed to load tournaments'}</p>
        `;
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      tournamentsListElement.innerHTML = `
        <p class="text-red-500">An error occurred while loading tournaments.</p>
      `;
    }
  }
  
  private getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  private setupEventListeners(): void {
    const form = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', this.handleCreateTournament.bind(this));
    }
    
    // Set min date for start_date to today
    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    const startTimeInput = document.getElementById('start_time') as HTMLInputElement;
    const endTimeInput = document.getElementById('end_time') as HTMLInputElement;
    
    if (startDateInput && endDateInput) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      startDateInput.min = formattedDate;
      endDateInput.min = formattedDate;
      
      // Update end date min value when start date changes
      startDateInput.addEventListener('change', () => {
        endDateInput.min = startDateInput.value;
        this.validateDates();
      });
      
      // Add event listeners for all date/time inputs to validate
      startDateInput.addEventListener('change', this.validateDates.bind(this));
      endDateInput.addEventListener('change', this.validateDates.bind(this));
      startTimeInput.addEventListener('change', this.validateDates.bind(this));
      endTimeInput.addEventListener('change', this.validateDates.bind(this));
    }
  }
  
  private validateDates(): boolean {
    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    const startTimeInput = document.getElementById('start_time') as HTMLInputElement;
    const endTimeInput = document.getElementById('end_time') as HTMLInputElement;
    const dateErrorElement = document.getElementById('date-error');
    
    if (!startDateInput.value || !endDateInput.value || !startTimeInput.value || !endTimeInput.value) {
      return false; // Not all fields filled yet
    }
    
    const now = new Date();
    const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
    const endDateTime = new Date(`${endDateInput.value}T${endTimeInput.value}`);
    
    // Clear previous error
    if (dateErrorElement) {
      dateErrorElement.textContent = '';
      dateErrorElement.classList.add('hidden');
    }
    
    // Check if start date is in the past
    if (startDateTime < now) {
      if (dateErrorElement) {
        dateErrorElement.textContent = 'Start date and time cannot be in the past.';
        dateErrorElement.classList.remove('hidden');
      }
      return false;
    }
    
    // Check if end date is at least 1 hour after start date
    const minEndDateTime = new Date(startDateTime.getTime());
    minEndDateTime.setHours(minEndDateTime.getHours() + 1);
    
    if (endDateTime < minEndDateTime) {
      if (dateErrorElement) {
        dateErrorElement.textContent = 'End date and time must be at least 1 hour after start date and time.';
        dateErrorElement.classList.remove('hidden');
      }
      return false;
    }
    
    return true;
  }
  
  private addTournamentEventListeners(): void {
    // View tournament details
    document.querySelectorAll('.view-tournament').forEach(button => {
      button.addEventListener('click', (e) => {
        const tournamentId = (e.currentTarget as HTMLElement).dataset.id;
        if (tournamentId) {
          this.router.navigateTo(`/tournaments/${tournamentId}`);
        }
      });
    });
    
    // Start tournament
    document.querySelectorAll('.start-tournament').forEach(button => {
      button.addEventListener('click', async (e) => {
        const tournamentId = (e.currentTarget as HTMLElement).dataset.id;
        if (tournamentId && confirm('Are you sure you want to start this tournament?')) {
          try {
            const response = await fetch(`/api/admin/tournaments/${tournamentId}/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            });
            
            const data = await response.json();
            
            if (data.success) {
              alert('Tournament started successfully');
              this.loadTournaments();
            } else {
              alert(data.error || 'Failed to start tournament');
            }
          } catch (error) {
            console.error('Error starting tournament:', error);
            alert('An error occurred while starting the tournament');
          }
        }
      });
    });
    
    // Cancel tournament
    document.querySelectorAll('.cancel-tournament').forEach(button => {
      button.addEventListener('click', async (e) => {
        const tournamentId = (e.currentTarget as HTMLElement).dataset.id;
        if (tournamentId && confirm('Are you sure you want to cancel this tournament?')) {
          try {
            const response = await fetch(`/api/admin/tournaments/${tournamentId}/cancel`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            });
            
            const data = await response.json();
            
            if (data.success) {
              alert('Tournament cancelled successfully');
              this.loadTournaments();
            } else {
              alert(data.error || 'Failed to cancel tournament');
            }
          } catch (error) {
            console.error('Error cancelling tournament:', error);
            alert('An error occurred while cancelling the tournament');
          }
        }
      });
    });
  }
  
  private async handleCreateTournament(e: Event): Promise<void> {
    e.preventDefault();
    
    // Validate dates first
    if (!this.validateDates()) {
      return; // Stop submission if validation fails
    }
    
    const nameInput = document.getElementById('name') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    const startTimeInput = document.getElementById('start_time') as HTMLInputElement;
    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    const endTimeInput = document.getElementById('end_time') as HTMLInputElement;
    const maxParticipantsInput = document.getElementById('max_participants') as HTMLSelectElement;
    
    // Combine date and time into ISO string format
    const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
    const endDateTime = new Date(`${endDateInput.value}T${endTimeInput.value}`);
    
    const tournamentData = {
      name: nameInput.value,
      description: descriptionInput.value,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      max_participants: parseInt(maxParticipantsInput.value)
    };
    
    try {
      const response = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(tournamentData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Tournament created successfully');
        (document.getElementById('create-tournament-form') as HTMLFormElement).reset();
        this.loadTournaments();
      } else {
        alert(data.error || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('An error occurred while creating the tournament');
    }
  }
  
  update(): void {
    this.loadTournaments();
  }
  
  destroy(): void {
    this.element = null;
  }
}