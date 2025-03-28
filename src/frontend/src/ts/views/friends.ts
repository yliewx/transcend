import { Page } from '../types';
import { Router } from '../router';
import { FriendService } from '../services/friend.service';

export class FriendsPage implements Page {
  private router: Router;
  private friendService: FriendService;
  private userId: number | null = null;
  private currentTab: 'friends' | 'pending' | 'search' = 'friends';
  private searchQuery: string = '';
  private searchResults: any[] = [];
  private currentFriends: any[] = [];
  private pendingRequests: any[] = [];
  private isLoading: boolean = false;
  
  constructor(router: Router, friendService: FriendService) {
    this.router = router;
    this.friendService = friendService;
  }
  
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow-md rounded-lg p-8">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Friends</h1>
            <p class="mt-2 text-gray-600">Connect with other players</p>
          </div>
          
          <!-- Tab Navigation -->
          <div class="flex border-b border-gray-200 mb-6">
            <button id="tab-friends" class="py-2 px-4 font-medium text-sm ${this.currentTab === 'friends' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}">
              My Friends
            </button>
            <button id="tab-pending" class="py-2 px-4 font-medium text-sm ${this.currentTab === 'pending' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}">
              Pending Requests
              <span id="pending-badge" class="hidden ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">0</span>
            </button>
            <button id="tab-search" class="py-2 px-4 font-medium text-sm ${this.currentTab === 'search' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}">
              Find Friends
            </button>
          </div>
          
          <!-- Loading State -->
          <div id="loading-indicator" class="text-center py-10 ${this.isLoading ? '' : 'hidden'}">
            <p class="text-lg text-gray-600">Loading...</p>
          </div>
          
          <!-- Error State -->
          <div id="error-container" class="hidden text-center py-10">
            <p class="text-lg text-red-600">Something went wrong. Please try again.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Retry
            </button>
          </div>
          
          <!-- Friends Tab Content -->
          <div id="friends-container" class="${this.currentTab === 'friends' && !this.isLoading ? '' : 'hidden'}">
            <div id="friends-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Friends will be dynamically inserted here -->
            </div>
            <div id="no-friends" class="text-center py-8 hidden">
              <p class="text-gray-600">You don't have any friends yet.</p>
              <button id="find-friends-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Find Friends
              </button>
            </div>
          </div>
          
          <!-- Pending Requests Tab Content -->
          <div id="pending-container" class="${this.currentTab === 'pending' && !this.isLoading ? '' : 'hidden'}">
            <div id="pending-requests-list" class="space-y-4">
              <!-- Pending requests will be dynamically inserted here -->
            </div>
            <div id="no-pending" class="text-center py-8 hidden">
              <p class="text-gray-600">No pending friend requests.</p>
            </div>
          </div>
          
          <!-- Search Tab Content -->
          <div id="search-container" class="${this.currentTab === 'search' && !this.isLoading ? '' : 'hidden'}">
            <div class="mb-6">
              <div class="flex items-center">
                <input 
                  id="search-input" 
                  type="text" 
                  placeholder="Search by username" 
                  class="flex-grow px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value="${this.searchQuery}"
                >
                <button 
                  id="search-btn" 
                  class="px-4 py-2 bg-indigo-600 text-white rounded-r hover:bg-indigo-700"
                >
                  Search
                </button>
              </div>
            </div>
            
            <div id="search-results" class="mt-4 space-y-4">
              <!-- Search results will be dynamically inserted here -->
            </div>
            <div id="no-results" class="text-center py-8 hidden">
              <p class="text-gray-600">No users found. Try a different search term.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Set up event handlers after adding to DOM
    setTimeout(() => this.setupEventHandlers(), 0);
    
    // Load initial data
    this.loadInitialData();
    
    return container;
  }
  
  private setupEventHandlers(): void {
    // Tab navigation
    document.getElementById('tab-friends')?.addEventListener('click', () => this.switchTab('friends'));
    document.getElementById('tab-pending')?.addEventListener('click', () => this.switchTab('pending'));
    document.getElementById('tab-search')?.addEventListener('click', () => this.switchTab('search'));
    
    // Search functionality
    document.getElementById('search-btn')?.addEventListener('click', () => this.performSearch());
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // Find friends button
    document.getElementById('find-friends-btn')?.addEventListener('click', () => this.switchTab('search'));
    
    // Retry button
    document.getElementById('retry-btn')?.addEventListener('click', () => this.loadInitialData());
  }
  
  private async loadInitialData(): Promise<void> {
    const userIdStr = sessionStorage.getItem('userId');
    this.userId = userIdStr ? parseInt(userIdStr, 10) : null;
    
    if (!this.userId) {
      this.showError('User ID not found');
      return;
    }
    
    this.isLoading = true;
    this.updateUI();
    
    try {
      // Load friends list
      const friendsResponse = await this.friendService.getFriends();
      if (friendsResponse.success) {
        this.currentFriends = friendsResponse.friends || [];
      } else {
        throw new Error(friendsResponse.error || 'Failed to load friends');
      }
      
      // Load pending requests
      const pendingResponse = await this.friendService.getPendingRequests();
      if (pendingResponse.success) {
        this.pendingRequests = pendingResponse.requests || [];
      } else {
        throw new Error(pendingResponse.error || 'Failed to load pending requests');
      }
      
      this.isLoading = false;
      this.updateUI();
      
    } catch (error) {
      console.error('Error loading friends data:', error);
      this.isLoading = false;
      this.showError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  private async performSearch(): Promise<void> {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.searchQuery = searchInput?.value.trim() || '';
    
    if (!this.searchQuery) {
      return;
    }
    
    this.isLoading = true;
    this.updateUI();
    
    try {
      const response = await this.friendService.searchUsers(this.searchQuery);
      
      if (response.success) {
        this.searchResults = response.users || [];
      } else {
        throw new Error(response.error || 'Search failed');
      }
      
      this.isLoading = false;
      this.updateUI();
      
    } catch (error) {
      console.error('Search error:', error);
      this.isLoading = false;
      this.showError(error instanceof Error ? error.message : 'Search failed');
    }
  }
  
  private switchTab(tab: 'friends' | 'pending' | 'search'): void {
    this.currentTab = tab;
    this.updateUI();
  }
  
  private updateUI(): void {
    // Update loading state
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      if (this.isLoading) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }
    
    // Update tab visibility
    ['friends', 'pending', 'search'].forEach(tab => {
      const container = document.getElementById(`${tab}-container`);
      const tabButton = document.getElementById(`tab-${tab}`);
      
      if (container) {
        if (this.currentTab === tab && !this.isLoading) {
          container.classList.remove('hidden');
        } else {
          container.classList.add('hidden');
        }
      }
      
      if (tabButton) {
        if (this.currentTab === tab) {
          tabButton.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
          tabButton.classList.remove('text-gray-500', 'hover:text-gray-700');
        } else {
          tabButton.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
          tabButton.classList.add('text-gray-500', 'hover:text-gray-700');
        }
      }
    });
    
    // Update pending badge
    const pendingBadge = document.getElementById('pending-badge');
    if (pendingBadge) {
      if (this.pendingRequests.length > 0) {
        pendingBadge.textContent = this.pendingRequests.length.toString();
        pendingBadge.classList.remove('hidden');
      } else {
        pendingBadge.classList.add('hidden');
      }
    }
    
    // Update content based on current tab
    if (!this.isLoading) {
      if (this.currentTab === 'friends') {
        this.renderFriendsList();
      } else if (this.currentTab === 'pending') {
        this.renderPendingRequests();
      } else if (this.currentTab === 'search') {
        this.renderSearchResults();
      }
    }
  }
  
  private renderFriendsList(): void {
    const friendsList = document.getElementById('friends-list');
    const noFriends = document.getElementById('no-friends');
    
    if (!friendsList || !noFriends) return;
    
    friendsList.innerHTML = '';
    
    if (this.currentFriends.length === 0) {
      friendsList.classList.add('hidden');
      noFriends.classList.remove('hidden');
      return;
    }
    
    friendsList.classList.remove('hidden');
    noFriends.classList.add('hidden');
    
    this.currentFriends.forEach(friend => {
      const friendCard = document.createElement('div');
      friendCard.className = 'bg-gray-50 rounded-lg p-4 flex items-center';
      
      const avatar = document.createElement('div');
      avatar.className = 'w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-800 font-bold text-xl mr-4';
      avatar.textContent = (friend.displayName || friend.username || 'User').charAt(0).toUpperCase();
      
      const details = document.createElement('div');
      details.className = 'flex-grow';
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${friend.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${friend.username}</p>
      `;
      
      const actions = document.createElement('div');
      actions.className = 'flex space-x-2';
      
      const challengeBtn = document.createElement('button');
      challengeBtn.className = 'px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700';
      challengeBtn.textContent = 'Challenge';
      challengeBtn.dataset.friendId = friend.id.toString();
      //challengeBtn.addEventListener('click', () => this.friendService.challengeFriend(friend.id));
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200';
      removeBtn.textContent = 'Remove';
      removeBtn.dataset.friendId = friend.id.toString();
      removeBtn.addEventListener('click', () => this.friendService.removeFriend(friend.id));
      
      actions.appendChild(challengeBtn);
      actions.appendChild(removeBtn);
      
      friendCard.appendChild(avatar);
      friendCard.appendChild(details);
      friendCard.appendChild(actions);
      
      friendsList.appendChild(friendCard);
    });
  }
  
  private renderPendingRequests(): void {
    const pendingList = document.getElementById('pending-requests-list');
    const noPending = document.getElementById('no-pending');
    
    if (!pendingList || !noPending) return;
    
    pendingList.innerHTML = '';
    
    if (this.pendingRequests.length === 0) {
      pendingList.classList.add('hidden');
      noPending.classList.remove('hidden');
      return;
    }
    
    pendingList.classList.remove('hidden');
    noPending.classList.add('hidden');
    
    this.pendingRequests.forEach(request => {
      const requestCard = document.createElement('div');
      requestCard.className = 'bg-gray-50 rounded-lg p-4 flex items-center';
      
      const avatar = document.createElement('div');
      avatar.className = 'w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-800 font-bold text-xl mr-4';
      avatar.textContent = (request.displayName || request.username || 'User').charAt(0).toUpperCase();
      
      const details = document.createElement('div');
      details.className = 'flex-grow';
      
      // Determine if it's an incoming or outgoing request
      const isIncoming = request.requestType === 'incoming';
      
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${request.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${request.username}</p>
        <p class="text-xs text-indigo-600 mt-1">${isIncoming ? 'Wants to be your friend' : 'Request sent'}</p>
      `;
      
      const actions = document.createElement('div');
      actions.className = 'flex space-x-2';
      
      if (isIncoming) {
        // Accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200';
        acceptBtn.textContent = 'Accept';
        acceptBtn.dataset.requestId = request.id.toString();
        acceptBtn.addEventListener('click', () => this.friendService.acceptFriendRequest(request.id));
        
        // Decline button
        const declineBtn = document.createElement('button');
        declineBtn.className = 'px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200';
        declineBtn.textContent = 'Decline';
        declineBtn.dataset.requestId = request.id.toString();
        declineBtn.addEventListener('click', () => this.friendService.declineFriendRequest(request.id));
        
        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
      } else {
        // Cancel request button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded hover:bg-gray-300';
        cancelBtn.textContent = 'Cancel Request';
        cancelBtn.dataset.requestId = request.id.toString();
        cancelBtn.addEventListener('click', () => this.friendService.cancelFriendRequest(request.id));
        
        actions.appendChild(cancelBtn);
      }
      
      requestCard.appendChild(avatar);
      requestCard.appendChild(details);
      requestCard.appendChild(actions);
      
      pendingList.appendChild(requestCard);
    });
  }
  
  private renderSearchResults(): void {
    const searchResults = document.getElementById('search-results');
    const noResults = document.getElementById('no-results');
    
    if (!searchResults || !noResults) return;
    
    searchResults.innerHTML = '';
    
    if (this.searchResults.length === 0 && this.searchQuery) {
      searchResults.classList.add('hidden');
      noResults.classList.remove('hidden');
      return;
    }
    
    if (!this.searchQuery) {
      searchResults.classList.add('hidden');
      noResults.classList.add('hidden');
      return;
    }
    
    searchResults.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    this.searchResults.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'bg-gray-50 rounded-lg p-4 flex items-center';
      
      const avatar = document.createElement('div');
      avatar.className = 'w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-800 font-bold text-xl mr-4';
      avatar.textContent = (user.displayName || user.username || 'User').charAt(0).toUpperCase();
      
      const details = document.createElement('div');
      details.className = 'flex-grow';
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${user.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${user.username}</p>
      `;
      
      const actions = document.createElement('div');
      
      // Check if this is the current user
      if (user.id === this.userId) {
        const selfTag = document.createElement('span');
        selfTag.className = 'px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded';
        selfTag.textContent = 'You';
        actions.appendChild(selfTag);
      } 
      // Check if this user is already a friend
      else if (this.currentFriends.some(friend => friend.id === user.id)) {
        const friendTag = document.createElement('span');
        friendTag.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded';
        friendTag.textContent = 'Friend';
        actions.appendChild(friendTag);
      } 
      // Check if there's a pending request
      else if (this.pendingRequests.some(request => request.id === user.id)) {
        const pendingTag = document.createElement('span');
        pendingTag.className = 'px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded';
        pendingTag.textContent = 'Pending';
        actions.appendChild(pendingTag);
      } 
      // Otherwise, show add friend button
      else {
        const addFriendBtn = document.createElement('button');
        addFriendBtn.className = 'px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700';
        addFriendBtn.textContent = 'Add Friend';
        addFriendBtn.dataset.userId = user.id.toString();
        addFriendBtn.addEventListener('click', () => this.friendService.sendFriendRequest(user.id));
        actions.appendChild(addFriendBtn);
      }
      
      userCard.appendChild(avatar);
      userCard.appendChild(details);
      userCard.appendChild(actions);
      
      searchResults.appendChild(userCard);
    });
  }

  private showError(message: string): void {
    this.isLoading = false;
    
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (errorContainer && errorMessage) {
      errorMessage.textContent = message;
      errorContainer.classList.remove('hidden');
    }
    
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
  }
}