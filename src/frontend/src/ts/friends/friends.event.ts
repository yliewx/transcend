import type { FriendsPage } from '../views/friends';
import { Notifications } from '../components/notifications';

export function onFriendRequestSent(this: FriendsPage, event: CustomEvent) {
  const { userId, request } = event.detail;
  
  this.pendingRequests.push({
    ...request,
    userId: request.userId || userId
  });

  this.updatePendingBadge();
  
  if (this.currentTab === 'search') {
    this.updateSearchUserCard(userId, 'pending');
  }
}

export function onFriendRequestAccepted(this: FriendsPage, event: CustomEvent) {
  const { requestId, userId, friend } = event.detail;
  
  this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
  this.currentFriends.push(friend);
  this.updatePendingBadge();
  
  if (this.currentTab === 'pending') {
    this.removeRequestCard(requestId);
    
    if (this.pendingRequests.length === 0) {
      this.showEmptyState('#pending-requests-list', '#no-pending');
    }
  }
  
  if (this.currentTab === 'search') {
    this.updateSearchUserCard(userId, 'friend');
  }
}

export function onFriendRequestDeclined(this: FriendsPage, event: CustomEvent) {
  const { requestId } = event.detail;
  
  const request = this.pendingRequests.find(req => req.id === requestId);
  const userId = request?.userId;      
  this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
  
  this.updatePendingBadge();
  
  if (this.currentTab === 'pending') {
    this.removeRequestCard(requestId);

    if (this.pendingRequests.length === 0) {
      this.showEmptyState('#pending-requests-list', '#no-pending');
    }
  }
  
  if (this.currentTab === 'search' && userId) {
    this.updateSearchUserCard(userId, 'add');
  }
}

export function onFriendRequestCancelled(this: FriendsPage, event: CustomEvent) {
  const { requestId } = event.detail;
        
  const request = this.pendingRequests.find(req => req.id === requestId);
  const userId = request?.userId;      
  this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);      
  this.updatePendingBadge();
  
  if (this.currentTab === 'pending') {
    this.removeRequestCard(requestId);
    
    if (this.pendingRequests.length === 0) {
      this.showEmptyState('#pending-requests-list', '#no-pending');
    }
  }
  
  if (this.currentTab === 'search' && userId) {
    this.updateSearchUserCard(userId, 'add');
  }
}

export function onFriendRemoved(this: FriendsPage, event: CustomEvent) {
  const { friendId } = event.detail;
        
  this.currentFriends = this.currentFriends.filter(friend => friend.id !== friendId);
  
  if (this.currentTab === 'friends') {
    this.removeFriendCard(friendId);
    
    if (this.currentFriends.length === 0) {
      this.showEmptyState('#friends-list', '#no-friends');
    }
  }
  
  if (this.currentTab === 'search') {
    this.updateSearchUserCard(friendId, 'add');
  }
}

export function onNotification(this: FriendsPage, event: CustomEvent) {
  Notifications.show(event.detail.type, event.detail.message);
}
