export function createPongPage(): HTMLElement 
{
    // Create main container
    const container = document.createElement('div');
    container.className = 'page pong-page';
    
    // Page header
    const header = document.createElement('h1');
    header.textContent = 'Pong Game';
    container.appendChild(header);
    
    // Description text
    const description = document.createElement('p');
    description.textContent = 'Classic Pong game. Use arrow keys to move your paddle.';
    container.appendChild(description);
    
    // Score display
    const scoreBoard = document.createElement('div');
    scoreBoard.className = 'score-board';
    
    const playerScore = document.createElement('div');
    playerScore.className = 'player-score';
    playerScore.textContent = 'Player: 0';
    
    const computerScore = document.createElement('div');
    computerScore.className = 'computer-score';
    computerScore.textContent = 'Computer: 0';
    
    scoreBoard.appendChild(playerScore);
    scoreBoard.appendChild(computerScore);
    container.appendChild(scoreBoard);
    
    // Game canvas container
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    
    // Create a static canvas just to show the UI layout
    const canvas = document.createElement('div');
    canvas.className = 'pong-canvas';
    
    // Create static game elements
    const playerPaddle = document.createElement('div');
    playerPaddle.className = 'paddle player-paddle';
    
    const computerPaddle = document.createElement('div');
    computerPaddle.className = 'paddle computer-paddle';
    
    const ball = document.createElement('div');
    ball.className = 'ball';
    
    const divider = document.createElement('div');
    divider.className = 'divider';
    
    // Add elements to the canvas
    canvas.appendChild(playerPaddle);
    canvas.appendChild(computerPaddle);
    canvas.appendChild(ball);
    canvas.appendChild(divider);
    
    gameContainer.appendChild(canvas);
    container.appendChild(gameContainer);
    
    // Controls section
    const controls = document.createElement('div');
    controls.className = 'game-controls';
    
    const startButton = document.createElement('button');
    startButton.className = 'start-button';
    startButton.textContent = 'Start Game';
    startButton.addEventListener('click', () => {
      alert('Start button clicked! (This is just a UI demo, no actual game functionality)');
    });
    
    const resetButton = document.createElement('button');
    resetButton.className = 'reset-button';
    resetButton.textContent = 'Reset Game';
    resetButton.addEventListener('click', () => {
      alert('Reset button clicked! (This is just a UI demo, no actual game functionality)');
    });
    
    controls.appendChild(startButton);
    controls.appendChild(resetButton);
    container.appendChild(controls);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'instructions';
    
    const instructionsTitle = document.createElement('h3');
    instructionsTitle.textContent = 'How to Play';
    
    const instructionsList = document.createElement('ul');
    
    const instruction1 = document.createElement('li');
    instruction1.textContent = 'Use Up and Down arrow keys to move your paddle';
    
    const instruction2 = document.createElement('li');
    instruction2.textContent = 'First to reach 10 points wins';
    
    const instruction3 = document.createElement('li');
    instruction3.textContent = 'Press "Start Game" to begin';
    
    instructionsList.appendChild(instruction1);
    instructionsList.appendChild(instruction2);
    instructionsList.appendChild(instruction3);
    
    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsList);
    container.appendChild(instructions);
    
    return container;
  }