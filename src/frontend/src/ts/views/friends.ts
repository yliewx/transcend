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
  private hasError: boolean = false;
  private boundEventHandlers: {[key: string]: EventListener} = {};
  
  // Element caching
  private element: HTMLElement | null = null;

  constructor(router: Router, friendService: FriendService) {
    this.router = router;
    this.friendService = friendService;
  }
  
  render(): HTMLElement {
    // Return cached element if it exists
    if (this.element) {
      return this.element;
    }
    
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
          
          <!-- Error State -->
          <div id="error-container" class="hidden text-center py-10">
            <p class="text-lg text-red-600">Something went wrong. Please try again.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Retry
            </button>
          </div>
          
          <!-- Friends Tab Content -->
          <div id="friends-container" class="${this.currentTab === 'friends' ? '' : 'hidden'}">
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
          <div id="pending-container" class="${this.currentTab === 'pending' ? '' : 'hidden'}">
            <div id="pending-requests-list" class="space-y-4">
              <!-- Pending requests will be dynamically inserted here -->
            </div>
            <div id="no-pending" class="text-center py-8 hidden">
              <p class="text-gray-600">No pending friend requests.</p>
            </div>
          </div>
          
          <!-- Search Tab Content -->
          <div id="search-container" class="${this.currentTab === 'search' ? '' : 'hidden'}">
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
    
    // Cache the element
    this.element = container;
    
    // Set up event handlers
    this.setupEventHandlers();
    this.setupDataEventListeners();
    
    // Load initial data
    setTimeout(() => this.loadInitialData(), 0);
    
    return container;
  }

  update(): void {
    if (this.element) {
      // Refresh data when page is revisited
      this.loadInitialData();
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.element) return;
    
    // Tab navigation
    const tabFriends = this.element.querySelector('#tab-friends');
    const tabPending = this.element.querySelector('#tab-pending');
    const tabSearch = this.element.querySelector('#tab-search');
    
    if (tabFriends) {
      tabFriends.addEventListener('click', () => this.switchTab('friends'));
    }
    if (tabPending) {
      tabPending.addEventListener('click', () => this.switchTab('pending'));
    }
    if (tabSearch) {
      tabSearch.addEventListener('click', () => this.switchTab('search'));
    }
    
    // Search functionality
    const searchBtn = this.element.querySelector('#search-btn');
    const searchInput = this.element.querySelector('#search-input');
    
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
    }
    if (searchInput) {
      searchInput.addEventListener('keypress', ((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      }) as EventListener);
    }
    
    // Find friends button
    const findFriendsBtn = this.element.querySelector('#find-friends-btn');
    if (findFriendsBtn) {
      findFriendsBtn.addEventListener('click', () => this.switchTab('search'));
    }
    
    // Retry button
    const retryBtn = this.element.querySelector('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadInitialData());
    }
  }
  
  private async loadInitialData(): Promise<void> {
    const userIdStr = sessionStorage.getItem('userId');
    this.userId = userIdStr ? parseInt(userIdStr, 10) : null;
    
    if (!this.userId) {
      this.showError('User ID not found');
      return;
    }
    
    this.hasError = false;
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

      this.updateUI();
      
    } catch (error) {
      console.error('Error loading friends data:', error);
      this.showError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  private async performSearch(): Promise<void> {
    if (!this.element) return;
    
    const searchInput = this.element.querySelector('#search-input') as HTMLInputElement;
    this.searchQuery = searchInput?.value.trim() || '';
    
    if (!this.searchQuery) {
      return;
    }
    
    this.hasError = false;
    this.updateUI();
    
    try {
      const response = await this.friendService.searchUsers(this.searchQuery);
      
      if (response.success) {
        this.searchResults = response.users || [];
      } else {
        throw new Error(response.error || 'Search failed');
      }
      
      this.updateUI();
      
    } catch (error) {
      console.error('Search error:', error);
      this.showError(error instanceof Error ? error.message : 'Search failed');
    }
  }
  
  private switchTab(tab: 'friends' | 'pending' | 'search'): void {
    this.currentTab = tab;
    this.hasError = false;
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.element) return;
    
    // Handle error container visibility
    const errorContainer = this.element.querySelector('#error-container');
    if (errorContainer) {
      if (this.hasError) {
        errorContainer.classList.remove('hidden');
      } else {
        errorContainer.classList.add('hidden');
      }
    }
    
    // Only update tab content if no error is present
    if (!this.hasError) {
      // Update tab visibility
      ['friends', 'pending', 'search'].forEach(tab => {
        const container = this.element?.querySelector(`#${tab}-container`);
        const tabButton = this.element?.querySelector(`#tab-${tab}`);
        
        if (container) {
          if (this.currentTab === tab) {
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
      
      // Update the pending badge count
      this.updatePendingBadge();
      
      // Update content based on current tab
      if (this.currentTab === 'friends') {
        this.renderFriendsList();
      } else if (this.currentTab === 'pending') {
        this.renderPendingRequests();
      } else if (this.currentTab === 'search') {
        this.renderSearchResults();
      }
    }
  }

  private updatePendingBadge(): void {
    if (!this.element) return;
    
    const pendingBadge = this.element.querySelector('#pending-badge');
    if (pendingBadge) {
      if (this.pendingRequests.length > 0) {
        pendingBadge.textContent = this.pendingRequests.length.toString();
        pendingBadge.classList.remove('hidden');
      } else {
        pendingBadge.classList.add('hidden');
      }
    }
  }
  
  private renderFriendsList(): void {
    if (!this.element) return;
    
    const friendsList = this.element.querySelector('#friends-list');
    const noFriends = this.element.querySelector('#no-friends');
    
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
    if (!this.element) return;
    
    const pendingList = this.element.querySelector('#pending-requests-list');
    const noPending = this.element.querySelector('#no-pending');
    
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
    if (!this.element) return;
    
    const searchResults = this.element.querySelector('#search-results');
    const noResults = this.element.querySelector('#no-results');
    
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
    if (!this.element) return;
    
    this.hasError = true;
    
    const errorContainer = this.element.querySelector('#error-container');
    const errorMessage = errorContainer?.querySelector('p');
    
    if (errorContainer) {
      if (errorMessage) {
        errorMessage.textContent = message;
      }
      errorContainer.classList.remove('hidden');
    }
  }

  private setupDataEventListeners(): void {
    this.removeDataEventListeners();
    
    this.boundEventHandlers.friendRequestSent = ((event: CustomEvent) => {
      const { userId, request } = event.detail;
      
      this.pendingRequests.push({
        ...request,
        userId: request.userId || userId
      });

      this.updatePendingBadge();
      
      // If we're in search results, update the specific user card
      if (this.currentTab === 'search') {
        this.updateSearchUserCard(userId, 'pending');
      }
    }) as EventListener;
    
    this.boundEventHandlers.friendRequestAccepted = ((event: CustomEvent) => {
      const { requestId, userId, friend } = event.detail;

      this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
      this.currentFriends.push(friend);
      this.updatePendingBadge();
      
      if (this.currentTab === 'pending') {
        this.removeRequestCard(requestId);
        
        if (this.pendingRequests.length === 0) {
          const pendingList = this.element?.querySelector('#pending-requests-list');
          const noPending = this.element?.querySelector('#no-pending');
          
          if (pendingList && noPending) {
            pendingList.classList.add('hidden');
            noPending.classList.remove('hidden');
          }
        }
      }
      
      if (this.currentTab === 'search') {
        this.updateSearchUserCard(userId, 'friend');
      }
    }) as EventListener;
    
    this.boundEventHandlers.friendRequestDeclined = ((event: CustomEvent) => {
      const { requestId } = event.detail;

      const request = this.pendingRequests.find(req => req.id === requestId);
      const userId = request?.userId;      
      this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
      
      this.updatePendingBadge();
      
      if (this.currentTab === 'pending') {
        this.removeRequestCard(requestId);
        
        if (this.pendingRequests.length === 0) {
          const pendingList = this.element?.querySelector('#pending-requests-list');
          const noPending = this.element?.querySelector('#no-pending');
          
          if (pendingList && noPending) {
            pendingList.classList.add('hidden');
            noPending.classList.remove('hidden');
          }
        }
      }
      
      if (this.currentTab === 'search' && userId) {
        this.updateSearchUserCard(userId, 'add');
      }

    }) as EventListener;
    
    this.boundEventHandlers.friendRequestCancelled = ((event: CustomEvent) => {
      const { requestId } = event.detail;
      
      const request = this.pendingRequests.find(req => req.id === requestId);
      const userId = request?.userId;      
      this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);      
      this.updatePendingBadge();
      
      if (this.currentTab === 'pending') {
        this.removeRequestCard(requestId);
        
        if (this.pendingRequests.length === 0) {
          const pendingList = this.element?.querySelector('#pending-requests-list');
          const noPending = this.element?.querySelector('#no-pending');
          
          if (pendingList && noPending) {
            pendingList.classList.add('hidden');
            noPending.classList.remove('hidden');
          }
        }
      }
      
      if (this.currentTab === 'search' && userId) {
        this.updateSearchUserCard(userId, 'add');
      }
    }) as EventListener;
    
    this.boundEventHandlers.friendRemoved = ((event: CustomEvent) => {
      const { friendId } = event.detail;
      
      this.currentFriends = this.currentFriends.filter(friend => friend.id !== friendId);
      
      if (this.currentTab === 'friends') {
        this.removeFriendCard(friendId);
        
        if (this.currentFriends.length === 0) {
          const friendsList = this.element?.querySelector('#friends-list');
          const noFriends = this.element?.querySelector('#no-friends');
          
          if (friendsList && noFriends) {
            friendsList.classList.add('hidden');
            noFriends.classList.remove('hidden');
          }
        }
      }
      
      if (this.currentTab === 'search') {
        this.updateSearchUserCard(friendId, 'add');
      }
    }) as EventListener;
    
    this.boundEventHandlers.notification = ((event: CustomEvent) => {
      this.showNotification(event.detail.type, event.detail.message);
    }) as EventListener;
    
    // Add all the event listeners
    document.addEventListener('friendRequestSent', this.boundEventHandlers.friendRequestSent);
    document.addEventListener('friendRequestAccepted', this.boundEventHandlers.friendRequestAccepted);
    document.addEventListener('friendRequestDeclined', this.boundEventHandlers.friendRequestDeclined);
    document.addEventListener('friendRequestCancelled', this.boundEventHandlers.friendRequestCancelled);
    document.addEventListener('friendRemoved', this.boundEventHandlers.friendRemoved);
    document.addEventListener('notification', this.boundEventHandlers.notification);
  }
  
  // Helper method to remove a friend card from the DOM
  private removeFriendCard(friendId: number): void {
    if (!this.element) return;
    
    const friendCard = this.element.querySelector(`button[data-friend-id="${friendId}"]`)?.closest('.bg-gray-50');
    
    if (friendCard) {
      // Add a fade-out animation
      friendCard.classList.add('transition-opacity', 'duration-300', 'opacity-0');
      
      // Remove after animation
      setTimeout(() => {
        friendCard.remove();
      }, 300);
    }
  }
  
  // Helper method to remove a request card from the DOM
  private removeRequestCard(requestId: number): void {
    if (!this.element) return;
    
    const requestCard = this.element.querySelector(`button[data-request-id="${requestId}"]`)?.closest('.bg-gray-50');
    
    if (requestCard) {
      // Add a fade-out animation
      requestCard.classList.add('transition-opacity', 'duration-300', 'opacity-0');
      
      // Remove after animation
      setTimeout(() => {
        requestCard.remove();
      }, 300);
    }
  }
  
  // Helper method to update a user card in search results
  private updateSearchUserCard(userId: number, newStatus: 'add' | 'pending' | 'friend'): void {
    const userCard = document.querySelector(`button[data-user-id="${userId}"]`)?.closest('.bg-gray-50');
    
    if (userCard) {
      const actionsContainer = userCard.querySelector('div:last-child');
      
      if (actionsContainer) {
        // Clear existing actions
        actionsContainer.innerHTML = '';
        
        if (newStatus === 'add') {
          // Add Friend button
          const addFriendBtn = document.createElement('button');
          addFriendBtn.className = 'px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700';
          addFriendBtn.textContent = 'Add Friend';
          addFriendBtn.dataset.userId = userId.toString();
          addFriendBtn.addEventListener('click', () => this.friendService.sendFriendRequest(userId));
          actionsContainer.appendChild(addFriendBtn);
        } else if (newStatus === 'pending') {
          // Pending tag
          const pendingTag = document.createElement('span');
          pendingTag.className = 'px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded';
          pendingTag.textContent = 'Pending';
          actionsContainer.appendChild(pendingTag);
        } else if (newStatus === 'friend') {
          // Friend tag
          const friendTag = document.createElement('span');
          friendTag.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded';
          friendTag.textContent = 'Friend';
          actionsContainer.appendChild(friendTag);
        }
      }
    }
  }

  private showNotification(type: 'success' | 'error' | 'info', message: string): void {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg transition-opacity duration-500 opacity-0 max-w-md ${
      type === 'success' ? 'bg-green-100 text-green-800' :
      type === 'error' ? 'bg-red-100 text-red-800' :
      'bg-blue-100 text-bluce-800'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          ${type === 'success' ? 
            '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' :
            type === 'error' ?
            '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>' :
            '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
          }
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <div class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button class="notification-close inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              type === 'success' ? 'text-green-500 hover:text-green-600 focus:ring-green-400' :
              type === 'error' ? 'text-red-500 hover:text-red-600 focus:ring-red-400' :
              'text-blue-500 hover:text-blue-600 focus:ring-blue-400'
            }">
              <span class="sr-only">Dismiss</span>
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
      notification.classList.remove('opacity-0');
      notification.classList.add('opacity-100');
    }, 10);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.classList.remove('opacity-100');
        notification.classList.add('opacity-0');
        setTimeout(() => {
          notification.remove();
        }, 500);
      });
    }
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.remove('opacity-100');
        notification.classList.add('opacity-0');
        setTimeout(() => {
          notification.remove();
        }, 500);
      }
    }, 5000);
  }

  private removeDataEventListeners(): void {
    if (this.boundEventHandlers.friendRequestSent) {
      document.removeEventListener('friendRequestSent', this.boundEventHandlers.friendRequestSent);
    }
    if (this.boundEventHandlers.friendRequestAccepted) {
      document.removeEventListener('friendRequestAccepted', this.boundEventHandlers.friendRequestAccepted);
    }
    if (this.boundEventHandlers.friendRequestDeclined) {
      document.removeEventListener('friendRequestDeclined', this.boundEventHandlers.friendRequestDeclined);
    }
    if (this.boundEventHandlers.friendRequestCancelled) {
      document.removeEventListener('friendRequestCancelled', this.boundEventHandlers.friendRequestCancelled);
    }
    if (this.boundEventHandlers.friendRemoved) {
      document.removeEventListener('friendRemoved', this.boundEventHandlers.friendRemoved);
    }
    if (this.boundEventHandlers.notification) {
      document.removeEventListener('notification', this.boundEventHandlers.notification);
    }
    
    this.boundEventHandlers = {};
  }

  public destroy(): void {
    // Clean up all document-level event listeners
    this.removeDataEventListeners();
    
    // Any other cleanup tasks can go here
    console.log('FriendsPage destroyed and event listeners removed');
  }

  // private logPendingRequests(location: string): void {
  //   console.log(`${location} - pendingRequests:`, JSON.parse(JSON.stringify(this.pendingRequests)));
  // }  
}