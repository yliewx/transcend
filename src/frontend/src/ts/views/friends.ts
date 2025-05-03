import { FriendRequestMessage, Page } from '../types';
import { Router } from '../router';
import { FriendService } from '../services/friend.service';
import { WebSocketManager } from '../services/websocket.manager';
import { onFriendRemoved, onFriendRequestAccepted, onFriendRequestCancelled, onFriendRequestDeclined, onFriendRequestSent, onNotification } from '../friends/friends.event';
import { handleFriendRemoved, handleFriendRequest } from '../friends/friends.socket';

export class FriendsPage implements Page {
  private router: Router;
  private wss: WebSocketManager;
  private friendService: FriendService;
  private userId: number | null = null;
  public currentTab: 'friends' | 'pending' | 'search' = 'friends';
  private searchQuery: string = '';
  private searchResults: any[] = [];
  public currentFriends: any[] = [];
  public pendingRequests: any[] = [];
  private hasError: boolean = false;
  private boundEventHandlers: {[key: string]: EventListener} = {};  
  private element: HTMLElement | null = null;

  /*------------------------------CONSTRUCTOR-------------------------------*/

  constructor(router: Router, friendService: FriendService) {
    this.router = router;
    this.friendService = friendService;
    this.wss = this.router.getWsManager();
    this.setupMessageHandlers();
  }

  /*-----------------------------RENDER ELEMENT-----------------------------*/

  render(): HTMLElement {
    if (this.element) {
      return this.element;
    }
    
    const container = document.createElement('div');
    container.className = 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8';
    
    container.innerHTML = `
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white dark:bg-gray-900 shadow-md rounded-lg p-8">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Friends</h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">Connect with other players</p>
          </div>
          
          <!-- Tab Navigation -->
          <div class="flex justify-center border-b border-gray-200 dark:border-gray-700 mb-6">
            <button id="tab-friends" class="py-2 px-4 font-medium text-sm ${
              this.currentTab === 'friends'
                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }">
              My Friends
            </button>
            <button id="tab-pending" class="py-2 px-4 font-medium text-sm ${
              this.currentTab === 'pending'
                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }">
              Pending Requests
              <span id="pending-badge" class="hidden ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-100">0</span>
            </button>
            <button id="tab-search" class="py-2 px-4 font-medium text-sm ${
              this.currentTab === 'search'
                ? 'text-pink-600 dark:text-pink-400 border-b-2 border-pink-600 dark:border-pink-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }">
              Find Friends
            </button>
          </div>
          
          <!-- Error State -->
          <div id="error-container" class="hidden text-center py-10">
            <p class="text-lg text-red-600 dark:text-red-400">Something went wrong. Please try again.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 dark:hover:bg-pink-500">
              Retry
            </button>
          </div>
          
          <!-- Friends Tab Content -->
          <div id="friends-container" class="${this.currentTab === 'friends' ? '' : 'hidden'}">
            <div id="friends-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Friends-->
            </div>
            <div id="no-friends" class="text-center py-8 hidden">
              <p class="text-gray-600 dark:text-gray-400">You don't have any friends yet.</p>
              <button id="find-friends-btn" class="btn-primary mt-4 px-4 py-2">
                Find Friends
              </button>
            </div>
          </div>
          
          <!-- Pending Requests Tab Content -->
          <div id="pending-container" class="${this.currentTab === 'pending' ? '' : 'hidden'}">
            <div id="pending-requests-list" class="space-y-4">
              <!-- Pending requests-->
            </div>
            <div id="no-pending" class="text-center py-8 hidden">
              <p class="text-gray-600 dark:text-gray-400">No pending friend requests.</p>
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
                  maxlength="20"
                  class="flex-grow px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-pink-500 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value="${this.searchQuery}"
                >
                <button 
                  id="search-btn" 
                  class="px-4 py-2 bg-pink-600 text-white rounded-r hover:bg-pink-700 dark:hover:bg-pink-500"
                >
                  Search
                </button>
              </div>
            </div>
            
            <div id="search-results" class="mt-4 space-y-4">
              <!-- Search results-->
            </div>
            <div id="no-results" class="text-center py-8 hidden">
              <p class="text-gray-600 dark:text-gray-400">No users found. Try a different search term.</p>
            </div>
          </div>
        </div>
      </div>
    `;  
    
    this.element = container;
    
    this.setupEventHandlers();
    this.setupDataEventListeners();
    
    setTimeout(() => this.loadInitialData(), 0);
    
    return container;
  }

  /*------------------------------REFRESH DATA------------------------------*/

  update(): void {
    if (this.element) {
      this.loadInitialData();
    }
  }

  private async loadInitialData(): Promise<void> {
    this.userId = parseInt(sessionStorage.getItem('userId') || '0', 10) || null;
    
    if (!this.userId) {
      this.showError('User ID not found');
      return;
    }
    
    this.hasError = false;
    this.updateUI();
    
    try {
      const [friendsResponse, pendingResponse] = await Promise.all([
        this.friendService.getFriends(),
        this.friendService.getPendingRequests()
      ]);
      
      if (!friendsResponse.success) {
        throw new Error(friendsResponse.error || 'Failed to load friends');
      }
      
      if (!pendingResponse.success) {
        throw new Error(pendingResponse.error || 'Failed to load pending requests');
      }
      
      this.currentFriends = friendsResponse.friends || [];
      this.pendingRequests = pendingResponse.requests || [];
      this.updateUI();
    } catch (error) {
      console.error('Error loading friends data:', error);
      this.showError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /*--------------------------CLICK EVENT HANDLERS--------------------------*/

  private setupEventHandlers(): void {
    if (!this.element) return;
    
    type HandlerTuple = [string, string, EventListener];
    
    const handlers: HandlerTuple[] = [
      ['#tab-friends', 'click', (() => this.switchTab('friends')) as EventListener],
      ['#tab-pending', 'click', (() => this.switchTab('pending')) as EventListener],
      ['#tab-search', 'click', (() => this.switchTab('search')) as EventListener],
      ['#search-btn', 'click', (() => this.performSearch()) as EventListener],
      ['#search-input', 'keypress', ((e: Event) => {
        if ((e as KeyboardEvent).key === 'Enter') this.performSearch();
      }) as EventListener],
      ['#find-friends-btn', 'click', (() => this.switchTab('search')) as EventListener],
      ['#retry-btn', 'click', (() => this.loadInitialData()) as EventListener]
    ];
    
    handlers.forEach(([selector, event, handler]) => {
      const element = this.element?.querySelector(selector);
      if (element) element.addEventListener(event, handler);
    });
  }
  
  private switchTab(tab: 'friends' | 'pending' | 'search'): void {
    this.currentTab = tab;
    this.hasError = false;
    this.updateUI();
  }

  /*----------------------------MESSAGE HANDLERS----------------------------*/

  private setupMessageHandlers(): void {
    this.wss.onUserEvent('online-status', (data: any) => this.updateFriendOnlineStatus(data));
    this.wss.onUserEvent('friend-request', handleFriendRequest.bind(this));
    this.wss.onUserEvent('friend-removed', handleFriendRemoved.bind(this));
  }

  private updateFriendOnlineStatus(data: any): void {
    const { userId, online } = data;
    if (userId == null || online == null) {
      console.error('Required fields missing from online status message');
      return;
    }
    const badge = document.querySelector(`[data-friend-id="${userId}"] .online-badge`);
    if (badge) {
      badge.classList.remove('bg-green-500', 'bg-gray-300');
      badge.classList.add(online ? 'bg-green-500' : 'bg-gray-300');
    }
  }

  /*--------------------------DATA EVENT HANDLERS---------------------------*/

  private setupDataEventListeners(): void {
    this.removeDataEventListeners();
    
    this.boundEventHandlers = {
      friendRequestSent: onFriendRequestSent.bind(this) as (e: Event) => void,
      friendRequestAccepted: onFriendRequestAccepted.bind(this) as (e: Event) => void,
      friendRequestDeclined: onFriendRequestDeclined.bind(this) as (e: Event) => void,
      friendRequestCancelled: onFriendRequestCancelled.bind(this) as (e: Event) => void,
      friendRemoved: onFriendRemoved.bind(this) as (e: Event) => void,
      notification: onNotification.bind(this) as (e: Event) => void
    };
    
    Object.entries(this.boundEventHandlers).forEach(([eventName, handler]) => {
      document.addEventListener(eventName, handler);
    });
  }

  /*-------------------------------UPDATE UI--------------------------------*/

  private updateUI(): void {
    if (!this.element) return;
    
    this.element.querySelector('#error-container')?.classList.toggle('hidden', !this.hasError);
    
    const tabs = {
      'friends': {
        container: '#friends-container',
        render: () => this.renderFriendsList()
      },
      'pending': {
        container: '#pending-container', 
        render: () => this.renderPendingRequests()
      },
      'search': {
        container: '#search-container',
        render: () => this.renderSearchResults()
      }
    };
    
    Object.entries(tabs).forEach(([tabName, config]) => {
      const isActive = this.currentTab === tabName && !this.hasError;
      
      const container = this.element?.querySelector(config.container);
      container?.classList.toggle('hidden', !isActive);
      if (isActive && container) config.render();
      
      const button = this.element?.querySelector(`#tab-${tabName}`);
      if (button) {
        button.classList.remove(
          'text-pink-600', 'dark:text-pink-400', 
          'text-gray-500', 'dark:text-gray-400',
          'border-b-2', 'border-pink-600', 'dark:border-pink-400',
          'hover:text-gray-700', 'dark:hover:text-gray-300'
        );
        
        if (isActive) {
          button.classList.add(
            'text-pink-600', 'dark:text-pink-400',
            'border-b-2', 'border-pink-600', 'dark:border-pink-400'
          );
        } else {
          button.classList.add(
            'text-gray-500', 'dark:text-gray-400',
            'hover:text-gray-700', 'dark:hover:text-gray-300'
          );
        }
      }
    });
    
    this.updatePendingBadge();
  }

  public updatePendingBadge(): void {
    const pendingBadge = this.element?.querySelector('#pending-badge');
    const hasPendingRequests = this.pendingRequests.length > 0;
    
    pendingBadge?.classList.toggle('hidden', !hasPendingRequests);
    if (hasPendingRequests && pendingBadge) {
      pendingBadge.textContent = this.pendingRequests.length.toString();
    }
  }

  public showEmptyState(listSelector: string, emptyStateSelector: string): void {
    const list = this.element?.querySelector(listSelector);
    const emptyState = this.element?.querySelector(emptyStateSelector);
    
    if (list && emptyState) {
      list.classList.add('hidden');
      emptyState.classList.remove('hidden');
    }
  }

  /*-----------------------------SEARCH FRIENDS-----------------------------*/

  private async performSearch(): Promise<void> {
    if (!this.element) return;
    
    const searchInput = this.element.querySelector('#search-input') as HTMLInputElement;
    this.searchQuery = searchInput?.value.trim() || '';
    
    if (!this.searchQuery) {
      return;
    }

    if (!this.searchQuery) {
      return;
    }
    
    if (this.searchQuery.length > 20) {
      this.searchQuery = this.searchQuery.substring(0, 20);
      searchInput.value = this.searchQuery;      
      alert('Search query cannot exceed 20 characters');
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

  /*-----------------------------RENDER FRIENDS-----------------------------*/

  public renderFriendsList(): void {
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
      friendCard.dataset.friendId = friend.id.toString();

      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'relative mr-4';

      const avatar = document.createElement('div');
      avatar.className = 'w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-800 font-bold text-xl mr-4';
      avatar.textContent = (friend.displayName || friend.username || 'User').charAt(0).toUpperCase();

      const onlineBadge = document.createElement('span');
      onlineBadge.className = `online-badge absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${friend.online ? 'bg-green-500' : 'bg-gray-300'} transition-colors duration-300`;

      avatarWrapper.appendChild(avatar);
      avatarWrapper.appendChild(onlineBadge);

      const details = document.createElement('div');
      details.className = 'flex-grow';
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${friend.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${friend.username}</p>
      `;
      
      const actions = document.createElement('div');
      actions.className = 'flex space-x-2';
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200';
      removeBtn.textContent = 'Remove';
      removeBtn.dataset.friendId = friend.id.toString();
      removeBtn.addEventListener('click', () => this.friendService.removeFriend(friend.id));
      
      actions.appendChild(removeBtn);
      
      friendCard.appendChild(avatarWrapper);
      friendCard.appendChild(details);
      friendCard.appendChild(actions);
      
      friendsList.appendChild(friendCard);
    });
  }

  /*-----------------------------RENDER REQUESTS----------------------------*/

  public renderPendingRequests(): void {
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
      avatar.className = 'w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-800 font-bold text-xl mr-4';
      avatar.textContent = (request.displayName || request.username || 'User').charAt(0).toUpperCase();
      
      const details = document.createElement('div');
      details.className = 'flex-grow';
      
      const isIncoming = request.requestType === 'incoming';
      
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${request.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${request.username}</p>
        <p class="text-xs text-pink-600 mt-1">${isIncoming ? 'Wants to be your friend' : 'Request sent'}</p>
      `;
      
      const actions = document.createElement('div');
      actions.className = 'flex space-x-2';
      
      if (isIncoming) {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200';
        acceptBtn.textContent = 'Accept';
        acceptBtn.dataset.requestId = request.id.toString();
        acceptBtn.addEventListener('click', () => this.friendService.acceptFriendRequest(request.id));
        
        const declineBtn = document.createElement('button');
        declineBtn.className = 'px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200';
        declineBtn.textContent = 'Decline';
        declineBtn.dataset.requestId = request.id.toString();
        declineBtn.addEventListener('click', () => this.friendService.declineFriendRequest(request.id));
        
        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
      } else {
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

  /*-----------------------------RENDER SEARCH------------------------------*/

  public renderSearchResults(): void {
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
      avatar.className = 'w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-800 font-bold text-xl mr-4';
      avatar.textContent = (user.displayName || user.username || 'User').charAt(0).toUpperCase();
      
      const details = document.createElement('div');
      details.className = 'flex-grow';
      details.innerHTML = `
        <h3 class="font-medium text-gray-900">${user.displayName || 'User'}</h3>
        <p class="text-sm text-gray-500">@${user.username}</p>
      `;
      
      const actions = document.createElement('div');
      
      if (user.id === this.userId) {
        const selfTag = document.createElement('span');
        selfTag.className = 'px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded';
        selfTag.textContent = 'You';
        actions.appendChild(selfTag);
      } 
      else if (this.currentFriends.some(friend => friend.id === user.id)) {
        const friendTag = document.createElement('span');
        friendTag.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded';
        friendTag.textContent = 'Friend';
        actions.appendChild(friendTag);
      } 
      else if (this.pendingRequests.some(request => request.id === user.id)) {
        const pendingTag = document.createElement('span');
        pendingTag.className = 'px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded';
        pendingTag.textContent = 'Pending';
        actions.appendChild(pendingTag);
      } 
      else {
        const addFriendBtn = document.createElement('button');
        addFriendBtn.className = 'px-3 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700';
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
    
    if (errorContainer && errorMessage) {
      errorMessage.textContent = message;
    }
    
    this.updateUI();
  }
  
  public removeFriendCard(friendId: number): void {
    if (!this.element) return;
    
    const friendCard = this.element.querySelector(`button[data-friend-id="${friendId}"]`)?.closest('.bg-gray-50');
    
    if (friendCard) {
      friendCard.classList.add('transition-opacity', 'duration-300', 'opacity-0');
      
      setTimeout(() => {
        friendCard.remove();
      }, 300);
    }
  }
  
  public removeRequestCard(requestId: number): void {
    if (!this.element) return;
    
    const requestCard = this.element.querySelector(`button[data-request-id="${requestId}"]`)?.closest('.bg-gray-50');
    
    if (requestCard) {
      requestCard.classList.add('transition-opacity', 'duration-300', 'opacity-0');
      
      setTimeout(() => {
        requestCard.remove();
      }, 300);
    }
  }
  
  public updateSearchUserCard(userId: number, newStatus: 'add' | 'pending' | 'friend'): void {
    const userCard = document.querySelector(`button[data-user-id="${userId}"]`)?.closest('.bg-gray-50');
    
    if (userCard) {
      const actionsContainer = userCard.querySelector('div:last-child');
      
      if (actionsContainer) {
        actionsContainer.innerHTML = '';
        
        if (newStatus === 'add') {
          const addFriendBtn = document.createElement('button');
          addFriendBtn.className = 'px-3 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700';
          addFriendBtn.textContent = 'Add Friend';
          addFriendBtn.dataset.userId = userId.toString();
          addFriendBtn.addEventListener('click', () => this.friendService.sendFriendRequest(userId));
          actionsContainer.appendChild(addFriendBtn);
        } else if (newStatus === 'pending') {
          const pendingTag = document.createElement('span');
          pendingTag.className = 'px-3 py-1 text-sm bg-yellow-100 text-yellow-600 rounded';
          pendingTag.textContent = 'Pending';
          actionsContainer.appendChild(pendingTag);
        } else if (newStatus === 'friend') {
          const friendTag = document.createElement('span');
          friendTag.className = 'px-3 py-1 text-sm bg-green-100 text-green-600 rounded';
          friendTag.textContent = 'Friend';
          actionsContainer.appendChild(friendTag);
        }
      }
    }
  }

  private removeDataEventListeners(): void {
    const events = [
      'friendRequestSent',
      'friendRequestAccepted',
      'friendRequestDeclined',
      'friendRequestCancelled',
      'friendRemoved',
      'notification'
    ] as const;
    
    events.forEach(event => {
      if (event in this.boundEventHandlers) {
        document.removeEventListener(event, this.boundEventHandlers[event]);
      }
    });
    
    this.boundEventHandlers = {};
  }

  public destroy(): void {}  
}