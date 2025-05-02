import type { TournamentDetailPage } from '../views/tournament.detail';

export function onParticipantJoined(this: TournamentDetailPage, event: CustomEvent) {
  this.update();
}

export function onTournamentStarted(this: TournamentDetailPage, event: CustomEvent) {
  const { tournament, matches } = event.detail;
  
  if (tournament) {
    this.tournament = tournament;
  }
  if (matches && Array.isArray(matches)) {
    this.matches = matches;
  }
  
  this.update();
}

export function onTournamentUpdated(this: TournamentDetailPage, event: CustomEvent) {
  const { tournament, matches, participants } = event.detail;
  
  if (tournament) {
    this.tournament = tournament;
  }  
  if (matches) {
    this.matches = matches;
  }  
  if (participants) {
    this.participants = participants;
  }
  
  this.renderContent(this.element!);
}

export function onNotification(this: TournamentDetailPage, event: CustomEvent) {
  this.showNotification(event.detail.message, event.detail.type);
}