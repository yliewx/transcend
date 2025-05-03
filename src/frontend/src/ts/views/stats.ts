import { Page, GameStats, MatchHistoryItem, LeaderboardPlayer } from '../types';
import { Router } from '../router';
import { GameStatsService } from '../services/game.stats.service';
import { EloHistoryItem } from '../types';
import { Chart } from 'chart.js/auto';


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
  private eloHistory: EloHistoryItem[] = [];
  private eloChart: any = null;
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
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="dark:bg-gray-900 bg-white shadow-lg rounded-xl p-8 transition-all duration-300">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-pink-400 to-indigo-600 dark:from-pink-400 dark:via-pink-300 dark:to-indigo-500">View Your Performance</h1>
          </div>
    
          <!-- Tabs -->
          <div class="flex justify-center mb-8">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex">
              <button id="stats-tab" class="px-6 py-2 text-sm font-medium rounded-full bg-pink-500 text-white shadow-md transition-all duration-300">
                Stats
              </button>
              <button id="leaderboard-tab" class="px-6 py-2 text-sm font-medium rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300">
                Leaderboard
              </button>
            </div>
          </div>
    
          <div id="stats-loading" class="text-center py-10">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div>
            <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading your statistics...</p>
          </div>
    
          <!-- My stats -->
          <div id="stats-content" class="hidden">
            <!-- Player stats -->
            <div id="stats-summary" class="mb-8 p-4 bg-gradient-to-r from-pink-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-sm">
              <h2 class="text-xl font-bold text-center mb-6 text-gray-800 dark:text-gray-200">Player Performance</h2>
              
              <div id="stats-row" class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Rank & ELO Rating -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-transform duration-300 hover:transform hover:scale-105">
                  <div class="flex flex-col items-center space-y-3">
                    <div class="h-16 w-16 rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 dark:from-pink-400 dark:to-indigo-500 flex items-center justify-center shadow-md">
                      <span id="rank-value" class="text-xl font-bold text-white">#0</span>
                    </div>
                    <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300">Rank & ELO</h3>
                    <p id="elo-rating-value" class="text-2xl font-bold text-gray-900 dark:text-white">1200</p>
                  </div>
                </div>
    
                <!-- Win Rate -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-transform duration-300 hover:transform hover:scale-105">
                  <div class="flex flex-col items-center space-y-3">
                    <div class="relative h-16 w-16">
                      <svg class="h-16 w-16" viewBox="0 0 36 36">
                        <path class="stroke-current text-gray-200 dark:text-gray-700" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path id="win-rate-circle" class="stroke-current text-green-500" stroke-width="3" fill="none" 
                          stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20" text-anchor="middle" class="text-lg font-bold fill-current text-gray-700 dark:text-gray-300" id="win-rate-text">0%</text>
                      </svg>
                    </div>
                    <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300">Win Rate</h3>
                    <p id="win-rate-value" class="text-2xl font-bold text-gray-900 dark:text-white">0%</p>
                  </div>
                </div>
    
                <!-- Games Played -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-transform duration-300 hover:transform hover:scale-105">
                    <div class="flex flex-col items-center space-y-3">
                        <div class="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 flex items-center justify-center shadow-md">
                        <span id="games-played-circle" class="text-xl font-bold text-white">0</span>
                        </div>
                        <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300">Games Played</h3>
                        <div class="flex space-x-4 text-sm">
                        <span id="games-won" class="text-2xl font-bold text-green-600 dark:text-green-400">0 W</span>
                        <span id="games-lost" class="text-2xl font-bold text-red-600 dark:text-red-400">0 L</span>
                        </div>
                    </div>
                </div>
    
               <!-- Win Streak -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md transition-transform duration-300 hover:transform hover:scale-105">
                    <div class="flex flex-col items-center space-y-3">
                        <div class="h-16 w-16 rounded-full bg-gradient-to-r from-amber-500 to-red-500 dark:from-amber-400 dark:to-red-400 flex items-center justify-center shadow-md">
                            <span id="win-streak-circle" class="text-xl font-bold text-white">0</span>
                        </div>
                        <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300">Win Streak</h3>
                        <div class="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400">
                            <span class="mr-1 text-2xl font-bold">Best:</span>
                            <span class="mr-1 text-2xl font-bold">🔥</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <!-- Stats Summary -->
            <div id="elo-chart-container" class="mb-8">
              <h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">ELO Rating History</h2>
              <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div id="elo-chart-loading" class="text-center py-10">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
                  <p class="mt-2 text-gray-600 dark:text-gray-400">Loading ELO history...</p>
                </div>
                <div id="elo-chart-content" class="hidden">
                  <div class="h-64">
                    <canvas id="elo-history-chart"></canvas>
                  </div>
                </div>
                <div id="elo-chart-empty" class="hidden text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p class="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No ELO history yet</p>
                  <p class="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">Play more games to see how your rating changes over time!</p>
                </div>
                <div id="elo-chart-error" class="hidden text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-red-500 dark:text-red-400 text-lg font-medium mb-2">Unable to load ELO history</p>
                  <p class="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">There was an error loading your ELO history data.</p>
                </div>
              </div>
            </div>
    
            <div id="match-history-container" class="mb-8">
              <h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Match History</h2>
              <div class="overflow-hidden rounded-xl shadow-md bg-white dark:bg-gray-800">
                <div class="overflow-x-auto">
                  <table class="min-w-full">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Opponent</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Score</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Result</th>
                      </tr>
                    </thead>
                    <tbody id="match-history-table-body" class="divide-y divide-gray-200 dark:divide-gray-700">
                      <!-- Match rows -->
                    </tbody>
                  </table>
                </div>
    
                <div id="pagination-controls" class="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                  <span id="pagination-info" class="text-sm text-gray-700 dark:text-gray-300">
                    Showing 1–10 of 0 results
                  </span>
                  <div class="flex space-x-2">
                    <button id="prev-page-btn" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300">
                      Previous
                    </button>
                    <button id="next-page-btn" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
    
          <!-- Leaderboard -->
          <div id="leaderboard-content" class="hidden">
            <div class="mb-6 p-6 bg-gradient-to-r from-pink-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-sm">
              <h2 class="text-xl font-bold text-center text-gray-800 dark:text-gray-200">Global Leaderboard</h2>
              <p class="text-center text-gray-600 dark:text-gray-400 mt-2">See how you rank against other players worldwide</p>
            </div>
            
            <div class="overflow-hidden rounded-xl shadow-md bg-white dark:bg-gray-800">
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th class="w-16 px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Player</th>
                      <th class="w-32 px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ELO</th>
                      <th class="w-32 px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Win Rate</th>
                      <th class="w-32 px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Streak</th>
                    </tr>
                  </thead>
                  <tbody id="leaderboard-table-body" class="divide-y divide-gray-200 dark:divide-gray-700">
                    <!-- Leaderboard rows -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
    
          <div id="stats-error" class="hidden text-center py-10">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-lg text-red-600 dark:text-red-400 mb-2">Unable to load your statistics</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Please check your connection and try again</p>
            <button id="retry-btn" class="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors duration-300">
              Retry
            </button>
          </div>
        </div>
      </div>
    `;  
    
    this.element = container;
    this.setupEventHandlers();
    setTimeout(() => this.loadData(), 0);
    
    return container;
  }
  
  private setupEventHandlers(): void {
    if (!this.element) return;
    
    const retryBtn = this.element.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadData());
    }
    
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
    
    if (statsTab && leaderboardTab) {
      if (tab === 'stats') {
        statsTab.classList.add('bg-pink-500', 'text-white', 'shadow-md');
        statsTab.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
        
        leaderboardTab.classList.remove('bg-pink-500', 'text-white', 'shadow-md');
        leaderboardTab.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
      } else {
        leaderboardTab.classList.add('bg-pink-500', 'text-white', 'shadow-md');
        leaderboardTab.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
        
        statsTab.classList.remove('bg-pink-500', 'text-white', 'shadow-md');
        statsTab.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
      }
    }
    
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
    
    const loadingElement = this.element.querySelector('#stats-loading');
    const statsContent = this.element.querySelector('#stats-content');
    const leaderboardContent = this.element.querySelector('#leaderboard-content');
    const errorElement = this.element.querySelector('#stats-error');
    
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

      const [statsResponse, historyResponse, leaderboardResponse, eloHistoryResponse] = await Promise.all([
        this.gameStatsService.getGameStats(),
        this.gameStatsService.getMatchHistory(),
        this.gameStatsService.getLeaderboard(),
        this.gameStatsService.getEloHistory() 
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
      this.eloHistory = eloHistoryResponse.success ? eloHistoryResponse.eloHistory || [] : [];       
      this.totalPages = Math.max(1, Math.ceil(this.matchHistory.length / this.itemsPerPage));
      
      this.renderStats();
      this.renderMatchHistory();
      this.renderLeaderboard();
      this.renderEloChart();
      
      if (loadingElement) loadingElement.classList.add('hidden');
      
      if (this.activeTab === 'stats' && statsContent) {
        statsContent.classList.remove('hidden');
      } else if (this.activeTab === 'leaderboard' && leaderboardContent) {
        leaderboardContent.classList.remove('hidden');
      } 
      this.animateStatsElements();
      
    } catch (error) {
      console.error('Error loading stats:', error);
      if (loadingElement) loadingElement.classList.add('hidden');
      if (errorElement) errorElement.classList.remove('hidden');
    }
  }
  
  
  private animateStatsElements(): void {
    if (!this.element) return;
    
    const statsCards = this.element.querySelectorAll('#stats-row > div');
    let delay = 100;
    
    statsCards.forEach(card => {
      setTimeout(() => {
        (card as HTMLElement).style.opacity = '0';
        (card as HTMLElement).style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          (card as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          (card as HTMLElement).style.opacity = '1';
          (card as HTMLElement).style.transform = 'translateY(0)';
        }, 50);
      }, delay);
      
      delay += 100;
    });
  }

  
  private renderStats(): void {
    if (!this.element || !this.stats) return;
    
    const winRateCircle = this.element.querySelector('#win-rate-circle');
    const winRateText = this.element.querySelector('#win-rate-text');
    const winPercentage = this.stats.win_percentage || 0;
    
    if (winRateCircle) {
      (winRateCircle as SVGPathElement).setAttribute(
        'stroke-dasharray', 
        `${winPercentage}, 100`
      );
    }
    
    if (winRateText) {
      winRateText.textContent = `${winPercentage}%`;
    }
    
    const gamesPlayedValue = this.element.querySelector('#games-played-circle');
    const gamesWon = this.element.querySelector('#games-won');
    const gamesLost = this.element.querySelector('#games-lost');
    
    if (gamesPlayedValue) {
      gamesPlayedValue.textContent = this.stats.games_played.toString();
    }
    
    if (gamesWon) {
      gamesWon.textContent = `${this.stats.games_won} W`;
    }
    
    if (gamesLost) {
      gamesLost.textContent = `${this.stats.games_lost} L`;
    }
    
    const winRateValue = this.element.querySelector('#win-rate-value');    
    if (winRateValue) {
      winRateValue.textContent = `${this.stats.win_percentage}%`;
    }
    
    const rankValue = this.element.querySelector('#rank-value');
    const eloRatingValue = this.element.querySelector('#elo-rating-value');
    if (rankValue) {
      rankValue.textContent = `#${this.stats.rank || 0}`;
    }
    if (eloRatingValue) {
      eloRatingValue.textContent = this.stats.elo_rating.toString();
    }
    
    const winStreakValue = this.element.querySelector('#win-streak-circle');
    const maxStreak = this.element.querySelector('#max-streak');

    if (winStreakValue) {
      winStreakValue.textContent = this.stats.current_win_streak.toString();      
      if (this.stats.current_win_streak >= 3) {
        winStreakValue.classList.add('text-amber-600', 'animate-pulse');
      } else {
        winStreakValue.classList.remove('text-amber-600', 'animate-pulse');
      }
    }
    
    if (maxStreak) {
      maxStreak.textContent = this.stats.max_win_streak.toString();
    }
  }
  
  private renderMatchHistory(): void {
    if (!this.element) return;
    
    const tableBody = this.element.querySelector('#match-history-table-body');
    if (!tableBody) return;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.matchHistory.length);
    const currentItems = this.matchHistory.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    if (currentItems.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="4" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No match history yet</p>
            <p class="text-gray-400 dark:text-gray-500 text-sm max-w-xs">Play your first game to start tracking your performance!</p>
          </div>
        </td>
      `;
      tableBody.appendChild(emptyRow);
    } else {
      currentItems.forEach((match, index) => {
        const row = this.createMatchRow(match);        
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
          row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, index * 50);
        
        tableBody.appendChild(row);
      });
    }

    const paginationInfo = this.element.querySelector('#pagination-info');
    if (paginationInfo) {
        if (this.matchHistory.length === 0) {
            paginationInfo.textContent = 'No results found';
        } else {
            paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${this.matchHistory.length} results`;
        }
    }
    
    const prevButton = this.element.querySelector('#prev-page-btn') as HTMLButtonElement;
    const nextButton = this.element.querySelector('#next-page-btn') as HTMLButtonElement;
    
    if (prevButton) {
        prevButton.disabled = this.currentPage <= 1;
    }
    
    if (nextButton) {
        nextButton.disabled = this.currentPage >= this.totalPages;
    }
  }


private createMatchRow(match: MatchHistoryItem): HTMLElement {
    const matchDate = new Date(match.match_date).toLocaleDateString();
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150';
    
    const isWin = match.user_won === 1;
    
    if (isWin) {
      row.classList.add('hover:bg-green-50');
      row.classList.add('dark:hover:bg-green-900/10');
    } else {
      row.classList.add('hover:bg-red-50');
      row.classList.add('dark:hover:bg-red-900/10');
    }
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
        ${matchDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 mr-3">
            ${match.opponent_name.slice(0, 2).toUpperCase()}
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">${match.opponent_name}</div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-center font-medium flex items-center justify-center space-x-3">
          <span class="${isWin ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-600 dark:text-gray-300'}">${match.user_score}</span>
          <span class="text-gray-400 text-xs">vs</span>
          <span class="${!isWin ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-300'}">${match.opponent_score}</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          isWin
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        }">
          ${isWin 
            ? '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Win'
            : '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>Loss'
          }
        </span>
      </td>
    `;
    
    return row;
  }


private renderLeaderboard(): void {
    if (!this.element) return;
    
    const tableBody = this.element.querySelector('#leaderboard-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (this.leaderboard.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="5" class="px-6 py-12 text-center">
          <div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">Leaderboard is empty</p>
            <p class="text-gray-400 dark:text-gray-500 text-sm max-w-xs">Be the first to climb the ranks!</p>
          </div>
        </td>
      `;
      tableBody.appendChild(emptyRow);
    } else {
      this.leaderboard.forEach((player, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150';
        
        const isCurrentUser = player.id === this.userId;
        if (isCurrentUser) {
            row.classList.add('bg-gradient-to-r');
            row.classList.add('from-pink-50');
            row.classList.add('to-pink-100');
            row.classList.add('dark:from-pink-900/20');
            row.classList.add('dark:to-pink-900/10');
        }
        
        const playerName = player.display_name || `Player #${player.id}`;
        
        let rankBadge = `<span class="text-gray-700 dark:text-gray-300 font-medium">#${player.rank}</span>`;
        if (player.rank === 1) {
          rankBadge = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">1</span>`;
        } else if (player.rank === 2) {
          rankBadge = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">2</span>`;
        } else if (player.rank === 3) {
          rankBadge = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold">3</span>`;
        }
        
        const streakElement = player.current_win_streak >= 3 
          ? `<div class="flex items-center">
              <span class="mr-1">${player.current_win_streak}</span>
              <span class="text-amber-500 animate-pulse">🔥</span>
            </div>` 
          : player.current_win_streak.toString();
        
        const winRate = this.stats?.win_percentage || 0;
        
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
          row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          row.style.opacity = '1';
          row.style.transform = 'translateY(0)';
        }, index * 50);
        
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="flex justify-center">${rankBadge}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10 rounded-full 
                ${isCurrentUser 
                  ? 'bg-gradient-to-r from-pink-500 to-indigo-600' 
                  : 'bg-gray-200 dark:bg-gray-700'} 
                flex items-center justify-center text-sm font-medium ${isCurrentUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}">
                ${playerName.slice(0, 2).toUpperCase()}
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium ${isCurrentUser ? 'text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}">
                  ${isCurrentUser ? 'You' : playerName}
                </div>
                ${isCurrentUser 
                  ? `<div class="text-xs text-gray-500 dark:text-gray-400">Current Player</div>` 
                  : ''}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="text-sm ${isCurrentUser ? 'font-bold text-pink-600 dark:text-pink-400' : 'font-medium text-gray-700 dark:text-gray-300'}">
              ${player.elo_rating}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="text-sm ${isCurrentUser ? 'font-medium text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'}">
              ${winRate}%
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <div class="text-sm ${player.current_win_streak >= 3 ? 'font-bold text-amber-600 dark:text-amber-400' : isCurrentUser ? 'font-bold text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-300'}">
              ${streakElement}
            </div>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
  }


  private renderEloChart(): void {
    if (!this.element) return;
    
    const chartLoading = this.element.querySelector('#elo-chart-loading');
    const chartContent = this.element.querySelector('#elo-chart-content');
    const chartEmpty = this.element.querySelector('#elo-chart-empty');
    const chartError = this.element.querySelector('#elo-chart-error');
    
    if (chartLoading) chartLoading.classList.add('hidden');
    if (chartContent) chartContent.classList.add('hidden');
    if (chartEmpty) chartEmpty.classList.add('hidden');
    if (chartError) chartError.classList.add('hidden');
    
    try {
      if (this.eloHistory.length === 0) {
        if (chartEmpty) chartEmpty.classList.remove('hidden');
        return;
      }
      
      if (chartContent) chartContent.classList.remove('hidden');
      
      if (this.eloChart) {
        this.eloChart.destroy();
      }
      
      const canvas = this.element.querySelector('#elo-history-chart') as HTMLCanvasElement;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const dates = this.eloHistory.map(item => item.formatted_date);
      const ratings = this.eloHistory.map(item => item.elo_rating);
      const results = this.eloHistory.map(item => item.result);
      
      const pointBackgroundColors = results.map(result => 
        result === 'Win' ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
      );
      
      const pointBorderColors = results.map(result => 
        result === 'Win' ? 'rgba(21, 128, 61, 1)' : 'rgba(185, 28, 28, 1)'
      );
      
      this.eloChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'ELO Rating',
            data: ratings,
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: pointBorderColors,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                afterLabel: (context: any) => {
                  const index = context.dataIndex;
                  const opponent = this.eloHistory[index].opponent_name;
                  const result = this.eloHistory[index].result;
                  const change = this.eloHistory[index].rating_change;
                  
                  return [
                    `Opponent: ${opponent}`,
                    `Result: ${result}`,
                    `Change: ${change > 0 ? '+' : ''}${change}`
                  ];
                }
              }
            },
            legend: {
              align: 'center',
              labels: {
                boxWidth: 0,
                font: {
                  family: "'Inter', sans-serif",
                  size: 12,
                },
              }
            }
          },
          scales: {
            y: { 
              beginAtZero: false,
              grid: {
                color: 'rgba(107, 114, 128, 0.1)'
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 11
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 11
                }
              }
            }
          }
        }
      });
     
      
    } catch (error) {
      console.error('Error rendering ELO chart:', error);
      if (chartError) chartError.classList.remove('hidden');
    }
  }
}
 