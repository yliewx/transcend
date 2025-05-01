import type { TournamentDetailPage } from '../views/tournament.detail';
import type { TournamentParticipant } from '../services/tournament.service';

/* Event handlers for local notifications:
- Dispatched in tournament.service.ts after receiving API response */


export function onParticipantJoined(this: TournamentDetailPage, event: CustomEvent) {
  console.log("onParticipantJoined called", event.detail);
  this.update();
}

// Handle tournament start event
export function onTournamentStarted(this: TournamentDetailPage, event: CustomEvent) {
  const { tournament, matches } = event.detail;
  
  if (tournament) {
    // Update tournament data
    this.tournament = tournament;
  }
  
  if (matches && Array.isArray(matches)) {
    // Update matches
    this.matches = matches;
  }
  
  // For tournament start, it's simpler to do a full update since many elements change
  this.update();
  
  // Show notification
  //this.showNotification('Tournament has started! The bracket is now available.', 'success');
}


// tournamentUpdated
export function onTournamentUpdated(this: TournamentDetailPage, event: CustomEvent) {
  const { tournament, matches, participants } = event.detail;
  
  // Update tournament data if provided
  if (tournament) {
    this.tournament = tournament;
  }
  
  // Update matches if provided
  if (matches) {
    this.matches = matches;
  }
  
  // Update participants if provided
  if (participants) {
    this.participants = participants;
  }
  
  // Refresh the entire UI
  this.renderContent(this.element!);
}

// notifySuccess, notifyError
export function onNotification(this: TournamentDetailPage, event: CustomEvent) {
  this.showNotification(event.detail.message, event.detail.type);
}