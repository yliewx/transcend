import { Page, GameStats, MatchHistoryItem, LeaderboardPlayer } from '../types';
import { Router } from '../router';
import { GameStatsService } from '../services/game.stats.service';

export class StatsPage implements Page {
  private router: Router;
  private gameStatsService: GameStatsService;
  private userId: number | null = null;
  private stats: GameStats | null = null;
  private matchHistory: MatchHistoryItem[] = [];
  private leaderboard: any[] = [];
  private currentPage: number = 1;
  private itemsPerPage: number = 10;
  private totalPages: number = 1;
  private activeTab: 'stats' | 'leaderboard' = 'stats';
  
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
          
          <!-- Tab navigation -->
          <div class="border-b border-gray-200 mb-6">
            <nav class="flex space-x-8">
              <button id="stats-tab" class="px-3 py-2 text-sm font-medium border-b-2 border-indigo-500 text-indigo-600">
                Statistics & Match History
              </button>
              <button id="leaderboard-tab" class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent">
                Leaderboard
              </button>
            </nav>
          </div>
          
          <div id="stats-loading" class="text-center py-10">
            <p class="text-lg text-gray-600">Loading statistics...</p>
          </div>
          
          <!-- Stats content tab -->
          <div id="stats-content" class="hidden">
            <!-- Stats in a single row -->
            <div id="stats-row" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 border rounded-lg p-4 bg-gray-50">
              <!-- Rank & ELO Rating -->
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <span id="rank-value" class="text-lg font-bold text-purple-700">#0</span>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Rank & ELO</h3>
                  <p id="elo-rating-value" class="text-lg font-bold text-gray-900">1200</p>
                </div>
              </div>
              
              <!-- Win Rate -->
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span class="text-lg font-bold text-green-700">%</span>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Win Rate</h3>
                  <p id="win-rate-value" class="text-lg font-bold text-gray-900">0%</p>
                </div>
              </div>
              
              <!-- Games Played -->
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-lg font-bold text-blue-700">G</span>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Games Played</h3>
                  <p id="games-played-value" class="text-lg font-bold text-gray-900">0</p>
                  <p id="games-played-details" class="text-xs text-gray-500">0 wins, 0 losses</p>
                </div>
              </div>
              
              <!-- Win Streak -->
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <span class="text-lg font-bold text-amber-700">🔥</span>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-gray-500">Win Streak</h3>
                  <p id="win-streak-value" class="text-lg font-bold text-gray-900">0</p>
                  <p id="win-streak-details" class="text-xs text-gray-500">Best: 0</p>
                </div>
              </div>
            </div>
            
            <!-- Match history section -->
            <div id="match-history-container" class="mb-8">
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
          
          <!-- Leaderboard content tab -->
          <div id="leaderboard-content" class="hidden">
            <div id="leaderboard-container">
              <h2 class="text-2xl font-bold text-gray-800 mb-4">Global Leaderboard</h2>
              <p class="text-gray-600 mb-6">See how you rank against other players</p>
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white rounded-lg overflow-hidden table-fixed">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="w-1/4 px-4 py-3 text-center text-sm font-medium text-gray-600">Rank</th>
                      <th class="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-600">Player</th>
                      <th class="w-1/4 px-4 py-3 text-center text-sm font-medium text-gray-600">ELO</th>
                      <th class="w-1/4 px-4 py-3 text-center text-sm font-medium text-gray-600">Streak</th>
                    </tr>
                  </thead>
                  <tbody id="leaderboard-table-body">
                    <!-- Leaderboard rows will be inserted here -->
                  </tbody>
                </table>
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
    
    // Set up tab navigation
    const statsTab = this.element.querySelector('#stats-tab');
    const leaderboardTab = this.element.querySelector('#leaderboard-tab');
    
    if (statsTab) {
      statsTab.addEventListener('click', () => this.switchTab('stats'));
    }
    
    if (leaderboardTab) {
      leaderboardTab.addEventListener('click', () => this.switchTab('leaderboard'));
    }
  }
  
  private switchTab(tab: 'stats' | 'leaderboard'): void {
    if (!this.element) return;
    
    this.activeTab = tab;
    
    const statsTab = this.element.querySelector('#stats-tab');
    const leaderboardTab = this.element.querySelector('#leaderboard-tab');
    const statsContent = this.element.querySelector('#stats-content');
    const leaderboardContent = this.element.querySelector('#leaderboard-content');
    
    // Update tab styles
    if (statsTab) {
      if (tab === 'stats') {
        statsTab.classList.add('border-indigo-500', 'text-indigo-600');
        statsTab.classList.remove('border-transparent', 'text-gray-500');
      } else {
        statsTab.classList.remove('border-indigo-500', 'text-indigo-600');
        statsTab.classList.add('border-transparent', 'text-gray-500');
      }
    }
    
    if (leaderboardTab) {
      if (tab === 'leaderboard') {
        leaderboardTab.classList.add('border-indigo-500', 'text-indigo-600');
        leaderboardTab.classList.remove('border-transparent', 'text-gray-500');
      } else {
        leaderboardTab.classList.remove('border-indigo-500', 'text-indigo-600');
        leaderboardTab.classList.add('border-transparent', 'text-gray-500');
      }
    }
    
    // Show/hide content based on active tab
    if (statsContent) {
      if (tab === 'stats') {
        statsContent.classList.remove('hidden');
      } else {
        statsContent.classList.add('hidden');
      }
    }
    
    if (leaderboardContent) {
      if (tab === 'leaderboard') {
        leaderboardContent.classList.remove('hidden');
      } else {
        leaderboardContent.classList.add('hidden');
      }
    }
  }
  
  private async loadData(): Promise<void> {
    if (!this.element) return;
    
    // Get DOM elements
    const loadingElement = this.element.querySelector('#stats-loading');
    const statsContent = this.element.querySelector('#stats-content');
    const leaderboardContent = this.element.querySelector('#leaderboard-content');
    const errorElement = this.element.querySelector('#stats-error');
    
    // Show loading state
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (statsContent) statsContent.classList.add('hidden');
    if (leaderboardContent) leaderboardContent.classList.add('hidden');
    if (errorElement) errorElement.classList.add('hidden');

    const userIdStr = sessionStorage.getItem('userId');
    this.userId = userIdStr ? parseInt(userIdStr, 10) : null;
    
    try {
      if (!this.userId) {
        throw new Error('User ID not found');
      }
      
      // Load all data in parallel for better performance
      const [statsResponse, historyResponse, leaderboardResponse] = await Promise.all([
        this.gameStatsService.getGameStats(),
        this.gameStatsService.getMatchHistory(),
        this.gameStatsService.getLeaderboard()
      ]);
      
      if (!statsResponse.success) {
        throw new Error('Failed to fetch game stats');
      }
      
      if (!historyResponse.success) {
        throw new Error('Failed to fetch match history');
      }
      
      this.stats = statsResponse.stats || null;
      this.matchHistory = historyResponse.matchHistory || [];
      this.leaderboard = leaderboardResponse.success ? leaderboardResponse.leaderboard || [] : [];
      
      // Calculate total pages
      this.totalPages = Math.max(1, Math.ceil(this.matchHistory.length / this.itemsPerPage));
      
      // Render data
      this.renderStats();
      this.renderMatchHistory();
      this.renderLeaderboard();
      
      // Hide loading, show content based on active tab
      if (loadingElement) loadingElement.classList.add('hidden');
      
      if (this.activeTab === 'stats' && statsContent) {
        statsContent.classList.remove('hidden');
      } else if (this.activeTab === 'leaderboard' && leaderboardContent) {
        leaderboardContent.classList.remove('hidden');
      }
      
    } catch (error) {
      console.error('Error loading stats:', error);
      
      // Show error state
      if (loadingElement) loadingElement.classList.add('hidden');
      if (errorElement) errorElement.classList.remove('hidden');
    }
  }
  
  private renderStats(): void {
    if (!this.element || !this.stats) return;
    
    // Update Games Played stats
    const gamesPlayedValue = this.element.querySelector('#games-played-value');
    const gamesPlayedDetails = this.element.querySelector('#games-played-details');
    
    if (gamesPlayedValue) {
      gamesPlayedValue.textContent = this.stats.games_played.toString();
    }
    
    if (gamesPlayedDetails) {
      gamesPlayedDetails.textContent = `${this.stats.games_won} wins, ${this.stats.games_lost} losses`;
    }
    
    // Update Win Rate value
    const winRateValue = this.element.querySelector('#win-rate-value');
    
    if (winRateValue) {
      winRateValue.textContent = `${this.stats.win_percentage}%`;
    }
    
    // Update Rank & ELO Rating value
    const rankValue = this.element.querySelector('#rank-value');
    const eloRatingValue = this.element.querySelector('#elo-rating-value');
    
    if (rankValue) {
      rankValue.textContent = `#${this.stats.rank || 0}`;
    }
    
    if (eloRatingValue) {
      eloRatingValue.textContent = this.stats.elo_rating.toString();
    }
    
    // Update Win Streak value
    const winStreakValue = this.element.querySelector('#win-streak-value');
    const winStreakDetails = this.element.querySelector('#win-streak-details');
    
    if (winStreakValue) {
      winStreakValue.textContent = this.stats.current_win_streak.toString();
      
      // Add pulsing animation effect for impressive streaks
      if (this.stats.current_win_streak >= 3) {
        winStreakValue.classList.add('text-amber-700', 'animate-pulse');
      } else {
        winStreakValue.classList.remove('text-amber-700', 'animate-pulse');
      }
    }
    
    if (winStreakDetails) {
      winStreakDetails.textContent = `Best: ${this.stats.max_win_streak}`;
    }
  }
  
  private renderMatchHistory(): void {
    if (!this.element) return;
    
    const tableBody = this.element.querySelector('#match-history-table-body');
    if (!tableBody) return;
    
    // Calculate slice for current page
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.matchHistory.length);
    const currentItems = this.matchHistory.slice(startIndex, endIndex);
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (currentItems.length === 0) {
      // No match history
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = `
        <td colspan="5" class="px-4 py-6 text-center text-gray-500">
          No match history found. Play some games to see your stats!
        </td>
      `;
      tableBody.appendChild(emptyRow);
    } else {
      // Create rows for each match item
      currentItems.forEach(match => {
        const row = this.createMatchRow(match);
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
  
  /**
   * Creates a match history row
   */
  private createMatchRow(match: MatchHistoryItem): HTMLElement {
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
    
    return row;
  }
  
  /**
   * Renders the leaderboard
   */
  private renderLeaderboard(): void {
    if (!this.element) return;
    
    const tableBody = this.element.querySelector('#leaderboard-table-body');
    if (!tableBody) return;
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (this.leaderboard.length === 0) {
      // No leaderboard data
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = `
        <td colspan="5" class="px-4 py-6 text-center text-gray-500">
          No players with ratings found yet.
        </td>
      `;
      tableBody.appendChild(emptyRow);
    } else {
      // Create rows for each player
      this.leaderboard.forEach(player => {
        const row = document.createElement('tr');
        row.className = 'border-t border-gray-200 hover:bg-gray-50';
        
        // Highlight the current user
        const isCurrentUser = player.id === this.userId;
        if (isCurrentUser) {
          row.classList.add('bg-blue-50');
        }
        
        // Format the player name (use display_name, or "Player #ID" if null)
        const playerName = player.display_name || `Player #${player.id}`;
        
        // Show win streak with fire emoji for 3+ streaks
        const streakDisplay = player.current_win_streak >= 3 
          ? `${player.current_win_streak} 🔥` 
          : player.current_win_streak.toString();
        
        row.innerHTML = `
          <td class="px-4 py-3 text-center text-sm ${isCurrentUser ? 'font-bold text-blue-800' : 'text-gray-600'}">
            #${player.rank}
          </td>
          <td class="px-4 py-3 text-sm ${isCurrentUser ? 'font-bold text-blue-800' : 'text-gray-600'}">
            ${isCurrentUser ? 'You' : playerName}
          </td>
          <td class="px-4 py-3 text-center text-sm ${isCurrentUser ? 'font-bold text-blue-800' : 'text-gray-600'}">
            ${player.elo_rating}
          </td>
          <td class="px-4 py-3 text-center text-sm ${player.current_win_streak >= 3 ? 'font-bold text-amber-600' : isCurrentUser ? 'font-bold text-blue-800' : 'text-gray-600'}">
            ${streakDisplay}
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
  }
}