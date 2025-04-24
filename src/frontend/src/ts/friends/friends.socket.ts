import { FriendRequestMessage } from '../types';
import type { FriendsPage } from '../views/friends';

/* Event handlers for external notifications:
- Sent by server via websocket messages if user is online
when the other party makes a request to the friend API routes */

// type: 'friend-request'
export function handleFriendRequest(this: FriendsPage, data: FriendRequestMessage) {
  console.log(`Inside handleFriendRequest. Type: ${data.requestStatus}`);
  switch (data.requestStatus) {
    // Receiving a friend request
    case 'pending':
      this.pendingRequests.push({ ...data.request, userId: data.friend.id });
      if (this.currentTab === 'pending') {
        this.renderPendingRequests();
      }
      break;
    // Friend request was accepted by another
    case 'accepted':
      this.currentFriends.push(data.friend);
      // fallthrough
    // Friend request was declined or cancelled by another
    case 'declined':
    case 'cancelled':
      this.pendingRequests = this.pendingRequests.filter(req => req.id !== data.request.id);
      if (this.currentTab === 'pending') {
        this.renderPendingRequests();
      } else if (this.currentTab === 'search') {
        this.updateSearchUserCard(data.friend.id, 'add');
        this.renderSearchResults();
      } else if (this.currentTab === 'friends') {
        this.renderFriendsList();
      }
      break;
    default:
      return;
  }

  this.updatePendingBadge();
  this.showNotification('info', data.message);
}

// type: 'friend-removed'
export function handleFriendRemoved(this: FriendsPage, data: { friendId: number, message: string }) {
  this.currentFriends = this.currentFriends.filter(friend => friend.id !== data.friendId);

  if (this.currentTab === 'friends') {
    this.removeFriendCard(data.friendId);
    if (this.currentFriends.length === 0) {
      this.showEmptyState('#friends-list', '#no-friends');
    }
  }

  if (this.currentTab === 'search') {
    this.updateSearchUserCard(data.friendId, 'add');
  }

  this.showNotification('info', data.message);
}
