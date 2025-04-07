export interface Card {
  name: string;
  suit: string;
  rank: number;
  emoji: string;
}

export class BlackjackGame {
  private deck: Card[] = [];
  private cardDeck: Card[] = [];
  private userName: string = '';
  private gameMode: string = 'awaiting username';
  private playerHand: Card[] = [];
  private dealerHand: Card[] = [];
  private playerSum: number = 0;
  private dealerSum: number = 0;
  private points: number = 100;

  constructor() {
    this.deck = this.makeDeck();
    this.cardDeck = this.shuffleCards(this.deck);
  }

  public playGame(input: string): string {
    if (this.gameMode === 'awaiting username') {
      if (!input.trim()) {
        return 'Please enter your name to start the game.';
      }
      this.userName = input.trim();
      this.gameMode = 'deal cards';
      return `Welcome, ${this.userName}! Let's play Blackjack!`;
    }

    if (this.gameMode === 'deal cards') {
      this.gameMode = 'player turn';
      return this.dealCards();
    }

    if (this.gameMode === 'player turn') {
      return 'It is your turn. Choose to Hit or Stand.';
    }

    if (this.gameMode === 'dealer turn') {
      const dealerResult = this.dealerPlay();
      const winner = this.determineWinner();
      this.gameMode = 'game over';
      return `${dealerResult}<br>${winner}`;
    }

    if (this.gameMode === 'game over') {
      return 'Game over. Please restart to play again.';
    }

    return 'Invalid game state.';
  }

  // Function to generate card deck
  private makeDeck(): Card[] {
    const deck: Card[] = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const emoji = ['♥', '♦️', '♣', '♠️'];

    for (let suitIndex = 0; suitIndex < suits.length; suitIndex++) {
      const currentSuit = suits[suitIndex];

      for (let rankCounter = 1; rankCounter <= 13; rankCounter++) {
        let cardName: string | number = rankCounter;

        if (cardName === 1) {
          cardName = 'Ace';
        } else if (cardName === 11) {
          cardName = 'Jack';
        } else if (cardName === 12) {
          cardName = 'Queen';
        } else if (cardName === 13) {
          cardName = 'King';
        }

        const card: Card = {
          name: cardName.toString(),
          suit: currentSuit,
          rank: rankCounter,
          emoji: emoji[suitIndex],
        };

        if (card.rank === 11 || card.rank === 12 || card.rank === 13) {
          card.rank = 10;
        }

        deck.push(card);
      }
    }
    return deck;
  }

  // Function to shuffle cards
  private shuffleCards(deck: Card[]): Card[] {
    let currentIndex = 0;
    while (currentIndex < deck.length) {
      const randomIndex = Math.floor(Math.random() * deck.length);
      const randomCard = deck[randomIndex];
      const currentCard = deck[currentIndex];
      deck[randomIndex] = currentCard;
      deck[currentIndex] = randomCard;
      currentIndex++;
    }
    return deck;
  }

  // Function to deal one card
  private deal(): Card {
    return this.cardDeck.shift()!;
  }

  // Function to calculate the sum of cards
  private calcCurrentSum(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + card.rank, 0);
  }

  // Function to print cards
  private printCards(cardsOnHand: Card[]): string {
    return cardsOnHand
      .map(
        (card) =>
          `${card.name} of ${card.suit} (${card.emoji})`
      )
      .join(', ');
  }

  // Function to handle Ace value
  private aceValue(currentSum: number, hand: Card[]): string {
    const hasAce = hand.some((card) => card.name === 'Ace');
    if (hasAce && currentSum + 10 <= 21) {
      return `<br>Your ace value is 11`;
    }
    return `<br>Your ace value is 1`;
  }

  // Function to deal two cards to player and dealer
  public dealCards(): string {
    for (let i = 0; i < 2; i++) {
      this.playerHand.push(this.deal());
      this.dealerHand.push(this.deal());
    }

    this.playerSum = this.calcCurrentSum(this.playerHand);
    this.dealerSum = this.calcCurrentSum(this.dealerHand);

    const playerBlackjack = this.isBlackjack(this.playerHand);
    const dealerBlackjack = this.isBlackjack(this.dealerHand);

    if (playerBlackjack) {
      this.points += 10;
      return `Wow! You got Blackjack!<br>You drew: ${this.printCards(
        this.playerHand
      )}<br><b>Points: ${this.points}</b>`;
    }

    if (dealerBlackjack) {
      this.points -= 10;
      return `Dealer got Blackjack!<br>Dealer drew: ${this.printCards(
        this.dealerHand
      )}<br><b>Points: ${this.points}</b>`;
    }

    return `You drew: ${this.printCards(this.playerHand)}<br>Dealer drew: ${
      this.dealerHand[0].name
    } of ${this.dealerHand[0].suit} (${this.dealerHand[0].emoji})<br>`;
  }

  // Function to check for Blackjack
  private isBlackjack(hand: Card[]): boolean {
    return (
      hand.length === 2 &&
      hand.some((card) => card.rank === 10) &&
      hand.some((card) => card.name === 'Ace')
    );
  }

  // Function to handle player hitting
  public playerHit(): string {
    const hitCard = this.deal();
    this.playerHand.push(hitCard);
    this.playerSum = this.calcCurrentSum(this.playerHand);

    if (this.playerSum > 21) {
      return `You hit and drew: ${hitCard.name} of ${hitCard.suit} (${hitCard.emoji}).<br>
              Your total is ${this.playerSum}. You busted!`;
    }

    return `You hit and drew: ${hitCard.name} of ${hitCard.suit} (${hitCard.emoji}).<br>
            Your total is now ${this.playerSum}.`;
  }

  // Function to handle dealer's play
  public dealerPlay(): string {
    while (this.dealerSum < 16) {
      const dealerHitCard = this.deal();
      this.dealerHand.push(dealerHitCard);
      this.dealerSum = this.calcCurrentSum(this.dealerHand);
    }

    return `Dealer's final hand: ${this.printCards(this.dealerHand)} (Sum: ${this.dealerSum})`;
  }

  // Function to determine the winner
  public determineWinner(): string {
    if (this.playerSum > 21) {
      return 'You busted! Dealer wins.';
    } else if (this.dealerSum > 21) {
      return 'Dealer busted! You win!';
    } else if (this.playerSum > this.dealerSum) {
      return 'You win!';
    } else if (this.playerSum < this.dealerSum) {
      return 'Dealer wins!';
    } else {
      return "It's a tie!";
    }
  }

  // Function to restart the game
  public restartGame(): void {
    this.deck = this.makeDeck();
    this.cardDeck = this.shuffleCards(this.deck);
    this.playerHand = [];
    this.dealerHand = [];
    this.playerSum = 0;
    this.dealerSum = 0;
    this.points = 100;
    this.gameMode = 'awaiting username';
  }
}