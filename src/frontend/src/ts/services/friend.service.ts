import { BaseApiService } from "./base.api";
import { FriendResponse, RequestResponse } from "../types";

export class FriendService extends BaseApiService {
  public async getFriends(): Promise<{success: boolean, friends?: FriendResponse[], error?: string}> {
    return this.request<{friends?: FriendResponse[]}>(
      '/friends', 
      'GET', 
      undefined, 
      true
    );
  }
  
  public async getPendingRequests(): Promise<{success: boolean, requests?: RequestResponse[], error?: string}> {
    return this.request<{requests?: RequestResponse[]}>(
      '/friends/pending', 
      'GET', 
      undefined, 
      true
    );
  }

  public async searchUsers(query: string): Promise<{success: boolean, users?: FriendResponse[], error?: string}> {
    const params = new URLSearchParams({
      q: query
    });
    
    return this.request<{users?: FriendResponse[]}>(
      `/users/search?${params.toString()}`, 
      'GET', 
      undefined, 
      true
    );
  }
  
  public async sendFriendRequest(userId: number): Promise<{success: boolean, request?: RequestResponse, error?: string}> {
    const response = await this.request<{request?: RequestResponse}>(
      '/friends/request', 
      'POST', 
      { userId }, 
      true
    );

    if (response.success && response.request) {
      const formattedRequest: RequestResponse = {
        id: response.request.id,
        username: response.request.username,
        displayName: response.request.displayName ?? response.request.username,
        requestType: (response.request.requestType as 'outgoing') ?? 'outgoing',
        status: response.request.status ?? 'pending',
        requestDate: new Date().toISOString()
      };
      
      const event = new CustomEvent('friendRequestSent', { 
        detail: { 
          userId,
          request: formattedRequest
        } 
      });
      document.dispatchEvent(event);
      this.notifySuccess('Friend request sent');
    } else {
      this.notifyError(response.error || 'Failed to send friend request');
    }
    
    return response;
  }
  
  public async acceptFriendRequest(requestId: number): Promise<{success: boolean, friend?: FriendResponse, error?: string}> {
    const response = await this.request<{friend?: FriendResponse}>(
      `/friends/request/${requestId}/accept`, 
      'POST', 
      undefined, 
      true,
      { omitContentType: true}
    );
    if (response.success) {
      const event = new CustomEvent('friendRequestAccepted', { 
        detail: { 
          requestId,
          friend: response.friend
        } 
      });
      document.dispatchEvent(event);      
      this.notifySuccess('Friend request accepted');
    } else {
      this.notifyError(response.error || 'Failed to accept friend request');
    }
    
    return response;
  }
  
  public async declineFriendRequest(requestId: number): Promise<{success: boolean, error?: string}> {
    const response = await this.request<{}>(
      `/friends/request/${requestId}/decline`, 
      'POST', 
      undefined, 
      true,
      { omitContentType: true}
    );

    if (response.success) {
      const event = new CustomEvent('friendRequestDeclined', { 
        detail: { requestId } 
      });
      document.dispatchEvent(event);
      this.notifySuccess('Friend request declined');
    } else {
      this.notifyError(response.error || 'Failed to decline friend request');
    }
    
    return response;
  }
  
  public async cancelFriendRequest(requestId: number): Promise<{success: boolean, error?: string}> {
    const response = await this.request<{}>(
      `/friends/request/${requestId}/cancel`, 
      'POST', 
      undefined, 
      true,
      { omitContentType: true}
    );

    if (response.success) {
      const event = new CustomEvent('friendRequestCancelled', { 
        detail: { requestId } 
      });
      document.dispatchEvent(event);
      this.notifySuccess('Friend request cancelled');
    } else {
      this.notifyError(response.error || 'Failed to cancel friend request');
    }
    
    return response;
  }
  
 
  public async removeFriend(friendId: number): Promise<{success: boolean, error?: string}> {
    const response = await this.request<{}>(
      `/friends/${friendId}`, 
      'DELETE', 
      undefined, 
      true,
      { omitContentType: true}
    );

    if (response.success) {
      const event = new CustomEvent('friendRemoved', { detail: { friendId } });
      document.dispatchEvent(event);      
      this.notifySuccess('Friend removed successfully');
    } else {
      this.notifyError(response.error || 'Failed to remove friend');
    }
    
    return response;
  }

  private notifySuccess(message: string): void {
    const event = new CustomEvent('notification', {
      detail: { type: 'success', message }
    });
    document.dispatchEvent(event);
  }

  private notifyError(message: string): void {
    const event = new CustomEvent('notification', {
      detail: { type: 'error', message }
    });
    document.dispatchEvent(event);
  }
}