const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express(); // Initialize Express app
const server = http.createServer(app); // Create HTTP server
const io = new Server(server); // Attach Socket.IO to the server

app.use(express.static("public")); // Serve static files from the "public" directory

let gameState = {
  board: Array(9).fill(null), // 3x3 board represented as an array
  players: {}, // Map of connected players and their symbols (e.g., { "socket1": "🐻" })
  currentPlayer: null, // Tracks the current player's symbol
  winner: null, // Tracks the winner's symbol or "draw" if applicable
};

// Function to reset the game state
function resetGame() {
  gameState = {
    board: Array(9).fill(null), // Clear the board
    players: {}, // Clear the player mapping
    currentPlayer: null, // Reset the current player
    winner: null, // Clear the winner
  };
}

// Function to broadcast the current game state to all connected clients
function broadcastGameState() {
  io.emit("updateGame", gameState); // Notify all clients with the updated game state
  io.emit("resetGame"); // Trigger reset-specific behaviors on the client
}

// Function to check for a winner or a draw
function checkWinner(board) {
  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  // Check each winning combination
  for (const [a, b, c] of winningCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return the symbol of the winner
    }
  }
  // If no winner and no empty spaces, it's a draw
  return board.includes(null) ? null : "draw"; // No moves left = draw
}

// Handle new client connections

io.on("connection", (socket) => {
  // Reject a third player if two players are already connected
  if (Object.keys(gameState.players).length >= 2) {
    socket.emit("gameFull"); // Notify the player the game is full
    socket.disconnect(); // Disconnect the third player
    return;
  }

  // Handle a player's symbol selection
socket.on("chooseSymbol", (symbol) => {
  if (!Object.keys(gameState.players).length) {
    // First player chooses their symbol
    gameState.players[socket.id] = symbol;
    const remainingSymbols = ["🐻", "🐨", "🦊", "🐵", "🐰", "🐮"].filter(
      (s) => s !== symbol
    );
    socket.emit("symbolAssigned", symbol); // Notify the player of their assigned symbol
    socket.broadcast.emit("remainingSymbols", remainingSymbols); // Notify the other player of the remaining symbols
  } else {
    // Second player chooses their symbol
    const usedSymbols = Object.values(gameState.players);
    const remainingSymbols = ["🐻", "🐨", "🦊", "🐵", "🐰", "🐮"].filter(
      (s) => !usedSymbols.includes(s)
    );

    if (remainingSymbols.includes(symbol)) {
      gameState.players[socket.id] = symbol; // Assign the chosen symbol
      gameState.currentPlayer = Object.values(gameState.players)[0]; // Set the first player to go
      socket.emit("symbolAssigned", symbol); // Notify the player of their assigned symbol
      broadcastGameState(); // Notify all clients of the updated game state
    }
  }
});
  // Handle player moves
socket.on("makeMove", (index) => {
  if (!gameState.winner && !gameState.board[index]) {
    // First check if there is no winner and the cell is empty
    const playerSymbol = gameState.players[socket.id]; // Get the player's symbol
    if (playerSymbol === gameState.currentPlayer) {
      // Check it's this player's turn
      gameState.board[index] = playerSymbol; // Place the symbol on the board

      // Always broadcast the updated game state first
      broadcastGameState(); // This ensures the UI reflects the move immediately

      const winner = checkWinner(gameState.board); // Check for a winner

      if (winner) {
        gameState.winner = winner; // Set the winner
        // Then determine the loser
        const loser = Object.values(gameState.players).find(
          (symbol) => symbol !== winner
        );

        // Notify all players of the result
        Object.keys(gameState.players).forEach((id) => {
          const message =
            gameState.players[id] === winner
              ? `Congratulations! You won! ${winner}🎉`
              : `You lost! Womp Womp!${loser} 😔`;
          io.to(id).emit("gameOver", { winner, loser, message }); // Send individualized messages to each player
        });
      } else {
        // Switch to the other player's turn
        gameState.currentPlayer = Object.values(gameState.players).find(
          (symbol) => symbol !== gameState.currentPlayer
        );

        broadcastGameState(); // Broadcast the updated game state
      }
    }
  }
});

// Handle game reset
socket.on("resetGame", () => {
  resetGame(); // Reset the game state
  broadcastGameState(); // Notify all clients
});

// Handle player disconnection
socket.on("disconnect", () => {
  resetGame(); // Reset the game when a player disconnects
  broadcastGameState(); // Notify all clients
});

  
});





server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
