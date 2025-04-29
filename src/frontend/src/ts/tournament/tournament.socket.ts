import type { TournamentDetailPage } from '../views/tournament.detail';
import { TournamentParticipant, Tournament, TournamentMatch } from '../services/tournament.service';

/* Event handlers for external notifications:
- Sent by server via websocket messages when tournament events occur */

export function handleParticipantJoined(this: TournamentDetailPage, data: { 
    tournamentId: number, 
    participant: TournamentParticipant,
    message: string 
  }) {
  console.log("handleParticipantJoined called", data);
  this.update();
  this.showNotification(`${data.participant.alias} has joined the tournament!`, 'info');
}

// type: 'tournament-started'
export function handleTournamentStarted(this: TournamentDetailPage, data: {
  tournamentId: number,
  tournament: Tournament,
  matches: TournamentMatch[],
  message: string
}) {
  // Check if this is for the current tournament
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }

  // Update tournament data
  if (data.tournament) {
    this.tournament = data.tournament;
  } else if (this.tournament) {
    this.tournament.status = 'active';
  }

  // Update matches
  if (data.matches && data.matches.length > 0) {
    this.matches = data.matches;
  }

  // Full UI refresh since tournament has started
  if (this.element) {
    this.renderContent(this.element);
  }

  // Show notification
  this.showNotification(data.message || 'Tournament has started! The bracket is now available.', 'success');
}

// type: 'match-updated'
export function handleMatchUpdated(this: TournamentDetailPage, data: {
  tournamentId: number,
  match: TournamentMatch,
  message: string
}) {
  // Check if this is for the current tournament
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }

  // Update the specific match in our matches array
  const matchIndex = this.matches.findIndex((m: TournamentMatch) => m.id === data.match.id);
  if (matchIndex >= 0) {
    this.matches[matchIndex] = data.match;
  } else {
    this.matches.push(data.match);
  }

  // Re-render the bracket
  if (this.element) {
    // Find the tournament bracket container
    const bracketContainer = this.element.querySelector('.tournament-bracket');
    if (bracketContainer) {
      // We could implement a more targeted update here if needed
      this.renderBracket();
    }
  }

  // Show notification
  this.showNotification(data.message || 'Match status has been updated', 'info');
}

// type: 'tournament-completed'
export function handleTournamentCompleted(this: TournamentDetailPage, data: {
  tournamentId: number,
  tournament: Tournament,
  matches: TournamentMatch[],
  participants: TournamentParticipant[],
  winner: TournamentParticipant,
  message: string
}) {
  // Check if this is for the current tournament
  if (!this.tournamentId || parseInt(this.tournamentId) !== data.tournamentId) {
    return;
  }

  // Update tournament data
  if (data.tournament) {
    this.tournament = data.tournament;
  } else if (this.tournament) {
    this.tournament.status = 'completed';
  }

  // Update matches and participants
  if (data.matches) {
    this.matches = data.matches;
  }
  
  if (data.participants) {
    this.participants = data.participants;
  }

  // Full UI refresh
  if (this.element) {
    this.renderContent(this.element);
  }

  // Show notification
  this.showNotification(data.message || `The tournament has been completed! ${data.winner.alias} is the champion!`, 'success');
}