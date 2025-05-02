import type { TournamentDetailPage } from '../views/tournament.detail';
import { TournamentParticipant, Tournament, TournamentMatch } from '../services/tournament.service';
import { TournamentPage } from '../views/tournaments';

export function handleTourPageUpdate(this: TournamentPage, data: {
  tournamentId?: number,
  tournament?: Tournament,
  allTournaments: Tournament[],
  userTournaments?: Tournament[],
  message: string
}) {
  if (data.allTournaments) {
    this.allTournaments = data.allTournaments;
  }
  if (data.userTournaments) {
    this.userTournaments = data.userTournaments;
  }

  const contentContainer = this.element?.querySelector('.px-4.py-6');
  if (contentContainer) {
    if (this.activeTab === 'all') {
      contentContainer.innerHTML = this.renderAllTournamentsContent();
    } else if (this.activeTab === 'my') {
      contentContainer.innerHTML = this.renderMyTournamentsContent();
    }
  }
}

export function handleParticipantJoined(this: TournamentDetailPage, data: { 
    tournamentId: number, 
    participant: TournamentParticipant,
    message: string 
  }) {
  this.update();
  this.showNotification(`${data.participant.alias} has joined the tournament!`, 'info');
}

export function handleTournamentStarted(this: TournamentDetailPage, data: {
  tournamentId: number,
  tournament: Tournament,
  matches: TournamentMatch[],
  message: string
}) {
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }

  if (data.tournament) {
    this.tournament = data.tournament;
  } else if (this.tournament) {
    this.tournament.status = 'active';
  }

  if (data.matches && data.matches.length > 0) {
    this.matches = data.matches;
  }

  if (this.element) {
    this.renderContent(this.element);
  }

  this.showNotification(data.message || 'Tournament has started! The bracket is now available.', 'success');
}

export function handleMatchUpdated(this: TournamentDetailPage, data: {
  tournamentId: number,
  match: TournamentMatch,
  message: string
}) {
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }

  const matchIndex = this.matches.findIndex((m: TournamentMatch) => m.id === data.match.id);
  if (matchIndex >= 0) {
    this.matches[matchIndex] = data.match;
  } else {
    this.matches.push(data.match);
  }

  if (this.element) {
    this.renderContent(this.element);
  }

  this.showNotification(data.message || 'Match status has been updated', 'info');
}

export function handleTournamentCompleted(this: TournamentDetailPage, data: {
  tournamentId: number,
  tournament: Tournament,
  matches: TournamentMatch[],
  participants: TournamentParticipant[],
  winner: TournamentParticipant,
  message: string
}) {
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }
  if (data.tournament) {
    this.tournament = data.tournament;
  } else if (this.tournament) {
    this.tournament.status = 'completed';
  }
  if (data.matches) {
    this.matches = data.matches;
  }
  
  if (data.participants) {
    this.participants = data.participants;
  }

  if (this.element) {
    this.renderContent(this.element);
  }

  this.showNotification(data.message || `The tournament has been completed! ${data.winner.alias} is the champion!`, 'success');
}