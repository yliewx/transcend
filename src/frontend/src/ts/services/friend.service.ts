import { BaseApiService } from "./base.api";
import { FriendResponse, RequestResponse } from "../types";

export class FriendService extends BaseApiService {
  /**
   * Get the current user's friends list
   */
  public async getFriends(): Promise<{success: boolean, friends?: FriendResponse[], error?: string}> {
    return this.request<{friends?: FriendResponse[]}>(
      '/friends', 
      'GET', 
      undefined, 
      true
    );
  }
  
  /**
   * Get pending friend requests (both sent and received)
   */
  public async getPendingRequests(): Promise<{success: boolean, requests?: RequestResponse[], error?: string}> {
    return this.request<{requests?: RequestResponse[]}>(
      '/friends/pending', 
      'GET', 
      undefined, 
      true
    );
  }
  
  /**
   * Search for users by username
   */
  public async searchUsers(query: string): Promise<{success: boolean, users?: FriendResponse[], error?: string}> {
    return this.request<{users?: FriendResponse[]}>(
      `/users/search?q=${encodeURIComponent(query)}`, 
      'GET', 
      undefined, 
      true
    );
  }
  
  /**
   * Send a friend request to another user
   */
  public async sendFriendRequest(userId: number): Promise<{success: boolean, request?: RequestResponse, error?: string}> {
    return this.request<{request?: RequestResponse}>(
      '/friends/request', 
      'POST', 
      { userId }, 
      true
    );
  }
  
  /**
   * Accept a friend request
   */
  public async acceptFriendRequest(requestId: number): Promise<{success: boolean, friend?: FriendResponse, error?: string}> {
    return this.request<{friend?: FriendResponse}>(
      `/friends/request/${requestId}/accept`, 
      'POST', 
      undefined, 
      true
    );
  }
  
  /**
   * Decline a friend request
   */
  public async declineFriendRequest(requestId: number): Promise<{success: boolean, error?: string}> {
    return this.request<{}>(
      `/friends/request/${requestId}/decline`, 
      'POST', 
      undefined, 
      true
    );
  }
  
  /**
   * Cancel a sent friend request
   */
  public async cancelFriendRequest(requestId: number): Promise<{success: boolean, error?: string}> {
    return this.request<{}>(
      `/friends/request/${requestId}/cancel`, 
      'POST', 
      undefined, 
      true
    );
  }
  
  /**
   * Remove a friend
   */
  public async removeFriend(friendId: number): Promise<{success: boolean, error?: string}> {
    return this.request<{}>(
      `/friends/${friendId}`, 
      'DELETE', 
      undefined, 
      true
    );
  }
}