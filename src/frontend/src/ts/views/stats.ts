import { Page, GameStats, MatchHistoryItem } from '../types';
import { Router } from '../router';
import { GameStatsService } from '../services/game.stats.service';

export class StatsPage implements Page {
  private router: Router;
  private gameStatsService: GameStatsService;
  private userId: number | null = null;
  private stats: GameStats | null = null;
  private matchHistory: MatchHistoryItem[] = [];
  private currentPage: number = 1;
  private itemsPerPage: number = 10;
  private totalPages: number = 1;
  
  // Element caching
  private element: HTMLElement | null = null;
  
  constructor(router: Router, gameStatsService: GameStatsService) {
    this.router = router;   
    this.gameStatsService = gameStatsService;
    this.userId = null;
  }
  
  async update(): Promise<void> {
    if (this.element) {
      await this.loadData();
    }
  }
  
  render(): HTMLElement {
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    // Initial loading state
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Your Game Statistics</h1>
            <p class="mt-2 text-gray-600 mb-4">View your performance and match history</p>
          </div>
          
          <div id="stats-loading" class="text-center py-10">
            <p class="text-lg text-gray-600">Loading statistics...</p>
          </div>
          
          <div id="stats-content" class="hidden">
            <!-- Stats boxes will be inserted here -->
            <div id="stats-boxes" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></div>
            
            <!-- Match history table will be inserted here -->
            <div id="match-history-container">
              <h2 class="text-2xl font-bold text-gray-800 mb-4">Match History</h2>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white rounded-lg overflow-hidden">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                      <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Opponent</th>
                      <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">Score</th>
                      <th class="px-4 py-3 text-center text-sm font-medium text-gray-600">Result</th>
                    </tr>
                  </thead>
                  <tbody id="match-history-table-body">
                    <!-- Match history rows will be inserted here -->
                  </tbody>
                </table>
              </div>
              
              <!-- Pagination controls -->
              <div id="pagination-controls" class="flex justify-between items-center mt-4">
                <div>
                  <span id="pagination-info" class="text-sm text-gray-600">
                    Showing 1-10 of 0 results
                  </span>
                </div>
                <div class="flex space-x-2">
                  <button id="prev-page-btn" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  <button id="next-page-btn" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div id="stats-error" class="hidden text-center py-10">
            <p class="text-lg text-red-600">Unable to load your statistics. Please try again later.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Retry
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Cache the element
    this.element = container;
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Load data (defer to not block rendering)
    setTimeout(() => this.loadData(), 0);
    
    return container;
  }
  
  private setupEventHandlers(): void {
    if (!this.element) return;
    
    // Set up retry button
    const retryBtn = this.element.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadData());
    }
    
    // Set up pagination buttons
    const prevBtn = this.element.querySelector('#prev-page-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderMatchHistory();
        }
      });
    }
    
    const nextBtn = this.element.querySelector('#next-page-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.renderMatchHistory();
        }
      });
    }
  }
  
  private async loadData(): Promise<void> {
    if (!this.element) return;
    
    // Get DOM elements
    const loadingElement = this.element.querySelector('#stats-loading');
    const contentElement = this.element.querySelector('#stats-content');
    const errorElement = this.element.querySelector('#stats-error');
    
    // Show loading state
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (contentElement) contentElement.classList.add('hidden');
    if (errorElement) errorElement.classList.add('hidden');

    const userIdStr = sessionStorage.getItem('userId');
    this.userId = userIdStr ? parseInt(userIdStr, 10) : null;
    
    try {
      if (!this.userId) {
        throw new Error('User ID not found');
      }
      
      // Load game stats using the service
      const statsResponse = await this.gameStatsService.getGameStats(this.userId);
      if (!statsResponse.success) {
        throw new Error('Failed to fetch game stats');
      }
      
      this.stats = statsResponse.stats || null;
      
      // Load match history using the service
      const historyResponse = await this.gameStatsService.getMatchHistory(this.userId);
      if (!historyResponse.success) {
        throw new Error('Failed to fetch match history');
      }
      
      this.matchHistory = historyResponse.matchHistory || [];
      
      // Calculate total pages
      this.totalPages = Math.max(1, Math.ceil(this.matchHistory.length / this.itemsPerPage));
      
      // Render data
      this.renderStats();
      this.renderMatchHistory();
      
      // Hide loading, show content
      if (loadingElement) loadingElement.classList.add('hidden');
      if (contentElement) contentElement.classList.remove('hidden');
      
    } catch (error) {
      console.error('Error loading stats:', error);
      
      // Show error state
      if (loadingElement) loadingElement.classList.add('hidden');
      if (errorElement) errorElement.classList.remove('hidden');
    }
  }
  
  private renderStats(): void {
    if (!this.element || !this.stats) return;
    
    const statsBoxesContainer = this.element.querySelector('#stats-boxes');
    if (!statsBoxesContainer) return;
    
    // Clear existing content
    statsBoxesContainer.innerHTML = '';
    
    // Games Played Box
    const gamesPlayedBox = document.createElement('div');
    gamesPlayedBox.className = 'bg-indigo-50 rounded-lg p-6 text-center';
    gamesPlayedBox.innerHTML = `
      <h2 class="text-xl font-bold text-indigo-800 mb-2">Games Played</h2>
      <p class="text-4xl font-bold text-indigo-600">${this.stats.gamesPlayed}</p>
      <p class="mt-2 text-gray-600 text-sm">
        ${this.stats.gamesWon} wins, ${this.stats.gamesLost} losses
      </p>
    `;
    statsBoxesContainer.appendChild(gamesPlayedBox);
    
    // Win Rate Box
    const winRateBox = document.createElement('div');
    winRateBox.className = 'bg-green-50 rounded-lg p-6 text-center';
    winRateBox.innerHTML = `
      <h2 class="text-xl font-bold text-green-800 mb-2">Win Rate</h2>
      <p class="text-4xl font-bold text-green-600">${this.stats.winRate}%</p>
      <p class="mt-2 text-gray-600 text-sm">
        ${this.stats.gamesPlayed > 0 ? 'Based on your match history' : 'Play games to see your win rate'}
      </p>
    `;
    statsBoxesContainer.appendChild(winRateBox);
  }
  
  private renderMatchHistory(): void {
    if (!this.element) return;
    
    const tableBody = this.element.querySelector('#match-history-table-body');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Calculate slice for current page
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.matchHistory.length);
    const currentItems = this.matchHistory.slice(startIndex, endIndex);
    
    if (currentItems.length === 0) {
        // No match history
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" class="px-4 py-6 text-center text-gray-500">
            No match history found. Play some games to see your stats!
            </td>
        `;
        tableBody.appendChild(emptyRow);
    } else {
        currentItems.forEach(match => {
            const matchDate = new Date(match.match_date).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.className = 'border-t border-gray-200 hover:bg-gray-50';
            
            row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-600">${matchDate}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${match.opponent_name}</td>
            <td class="px-4 py-3 text-center text-sm font-medium">
                <span class="${match.user_won === 1 ? 'text-green-600' : 'text-gray-600'}">${match.user_score}</span>
                <span class="text-gray-400 mx-1">-</span>
                <span class="${match.user_won === 0 ? 'text-red-600' : 'text-gray-600'}">${match.opponent_score}</span>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                match.user_won === 1
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }">
                ${match.user_won === 1 ? 'Win' : 'Loss'}
                </span>
            </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // Update pagination info
    const paginationInfo = this.element.querySelector('#pagination-info');
    if (paginationInfo) {
        if (this.matchHistory.length === 0) {
            paginationInfo.textContent = 'No results found';
        } else {
            paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${this.matchHistory.length} results`;
        }
    }
    
    // Update pagination button states
    const prevButton = this.element.querySelector('#prev-page-btn') as HTMLButtonElement;
    const nextButton = this.element.querySelector('#next-page-btn') as HTMLButtonElement;
    
    if (prevButton) {
        prevButton.disabled = this.currentPage <= 1;
    }
    
    if (nextButton) {
        nextButton.disabled = this.currentPage >= this.totalPages;
    }
  }
}