const socket = io(); // Auto-connect to the same host (server)

// DOM Elements
const cells = document.querySelectorAll(".cell"); // All game board cells
const chooseSymbolDiv = document.getElementById("choose-symbol"); // Symbol selection section
const gameContainerDiv = document.getElementById("game-container"); // Game board container
const statusText = document.getElementById("status"); // Status message text
const resetButton = document.getElementById("reset-button"); // Reset game button

let mySymbol = null; // The symbol (emoji) assigned to this player
let currentPlayer = null; // The current player's symbol (whose current turn it is)

// Function to updates the status text with appropriate styling.
function showMessage(message, type = "info") {
  statusText.textContent = message; // Update the status text
  statusText.className = type; // Apply appropriate styling based on the type
}

// Handles game reset functionality by emitting the resetGame event to the server.
resetButton.addEventListener("click", () => {
  socket.emit("resetGame"); // Emit reset game event to the server
  showMessage("Resetting the game...", "info"); // Notify the player that the reset is happening
});

// Handle symbol selection by the player
document.querySelectorAll("#choose-symbol button").forEach((button) => {
  button.addEventListener("click", () => {
    const chosenSymbol = button.getAttribute("data-symbol"); // Get the selected emoji
    socket.emit("chooseSymbol", chosenSymbol); // Send the chosen symbol to the server
  });
});

// Updates the game board and provides feedback on whose turn it is or if the game is over.
function updateBoard(game) {
  game.board.forEach((value, index) => {
    const cell = cells[index];
    cell.textContent = value || ""; // Update each cell with the player's symbol or clear it
    cell.classList.toggle("taken", !!value); // Mark cell as 'taken' if it has a value
  });

  currentPlayer = game.currentPlayer; // Update the current player's turn

  if (game.winner) {
    // Display game over message if there's a winner
    resetButton.style.display = "block";
  } else if (currentPlayer) {
    // Show whose current turn it is
    showMessage(
      currentPlayer === mySymbol ? "Your turn!" : "Opponent's turn!",
      "info"
    );
  }
}

// Handles real-time events from the server for game updates,
// resets, symbol assignments, and end-game scenarios.
socket.on("updateGame", (game) => {
  if (!game.players || Object.keys(game.players).length === 0) {
    // If the game has been reset
    cells.forEach((cell) => {
      cell.textContent = ""; // Clear all cells
      cell.classList.remove("taken", "winner-cell"); // Remove all classes
    });
    chooseSymbolDiv.style.display = "block"; // Show the symbol selection section
    gameContainerDiv.style.display = "none"; // Hide the game board
    resetButton.style.display = "none"; // Hide the reset button
    showMessage("Game has been reset. Choose your animal.", "info"); // Notify all players

    // Restore all six symbols for selection
    const allSymbols = ["🐻", "🐨", "🦊", "🐵", "🐰", "🐮"];
    document
      .querySelectorAll("#choose-symbol button")
      .forEach((button, index) => {
        button.style.display = "inline-block"; // Make all buttons are visible
        button.setAttribute("data-symbol", allSymbols[index]); // Reset symbol data
      });
  } else {
    // Or else if the game is still ongoing, update the board
    updateBoard(game);
  }
});

// Handle the end of the game (winner/loser messaging)
socket.on("gameOver", ({ winner, loser, message }) => {
  showMessage(message, "info"); // Display the message sent by the server
  resetButton.style.display = "block"; // Show the reset button
});

// Handle symbol assignment for the first player
socket.on("symbolAssigned", (symbol) => {
  mySymbol = symbol; // Store the assigned symbol
  chooseSymbolDiv.style.display = "none"; // Hide the symbol selection section
  gameContainerDiv.style.display = "grid"; // Show game board
  showMessage(`You are ${symbol}`, "info"); // Remind the player of their symbol
});

// Handle remaining symbols options available for second player
socket.on("remainingSymbols", (remainingSymbols) => {
  showMessage("Choose your animal:", "info"); // Prompt player 2 to choose, because player 1 has already chosen.
  document.querySelectorAll("#choose-symbol button").forEach((button) => {
    const symbol = button.getAttribute("data-symbol"); // Get the button's symbol
    button.style.display = remainingSymbols.includes(symbol)
      ? "inline-block" // Show if available
      : "none"; // Hide if unavailable
  });
});

// Handle cell clicks (each player's move) before sending it to the server.
cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    const index = cell.dataset.index; // Get the cell's index
    if (!cell.classList.contains("taken") && currentPlayer === mySymbol) {
      socket.emit("makeMove", parseInt(index)); // Send/emit the move to the server
    } else if (cell.classList.contains("taken")) {
      showMessage("Cell already taken!", "error"); // Notify if the cell is occupied
    } else {
      showMessage("Not your turn!", "error"); // Notify if it's not the player's turn
    }
  });
});
