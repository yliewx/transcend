import { FriendRequestMessage } from '../types';
import type { FriendsPage } from '../views/friends';
import { Notifications } from '../components/notifications';

export function handleFriendRequest(this: FriendsPage, data: FriendRequestMessage) {
  switch (data.requestStatus) {
    case 'pending':
      this.pendingRequests.push({ ...data.request, userId: data.friend.id });
      if (this.currentTab === 'pending') {
        this.renderPendingRequests();
      }
      break;
    case 'accepted':
      this.currentFriends.push(data.friend);
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
  Notifications.show('info', data.message);
}

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

  Notifications.show('info', data.message);
}
