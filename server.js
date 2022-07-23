const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const words = require('./definitions/words.json');
const acronyms = require('./definitions/acronyms.json');
const scores = require('./routes/scores');


//set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine','pug');
app.use(express.json());
app.use('/scores', scores);

// connections
const currentConnections = [];
let gameConnections = [];

// game variables
let currentPlayerDefinitions = [];
let playerSelections = [];
let numPlayersSubmitted = 0;
let nextRoundVote = 0;
let dealingPlayerIndex = 0;
const allDecks = [words, acronyms];
let currentDeck = allDecks[0];

// Max Number of players
const maxPlayers = 4;

let wordIndex = Math.floor(Math.random() * currentDeck.length);
// Index 0 is correct definition
currentPlayerDefinitions.push({definition: currentDeck[wordIndex].definition, playersChoosing: []});

// listen for connections
io.on('connection', socket => {
    let playerid = null;
    if (currentConnections.length === maxPlayers){
        console.log('Room is full');
        socket.emit('fullroom');
        return;
    }

    //------------------------------------------------------
    //               GAME EVENTS
    //------------------------------------------------------

    if (gameConnections.length > 0){
        socket.emit('dealing-player', gameConnections[dealingPlayerIndex]);   
    }
    
    socket.on('chosen-deck', (deckIndex) => {
        currentDeck = allDecks[deckIndex];
        resetGameVariables();
        dealingPlayerIndex += 1;
        if (dealingPlayerIndex > gameConnections.length - 1) dealingPlayerIndex = 0; // wrap around
        io.emit('go-to-game');
    });

    // Checks if the player exists in the lobby and calls events accordingly
    socket.on('player-exists', (id) => {
        // Use game connections
        const index = gameConnections.findIndex(object => {
            return object.id === id;
        });

        const defIndex = currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (index > -1){
            currentConnections.push(gameConnections[index]);
            playerid = id;   
        }else{
            socket.emit('send-to-home');
        }
        
        // If the player has reconnected and already submitted
        if (defIndex > -1){
            socket.emit('already-submitted');
        }

        // If all players have already submitted definitions
        if (currentPlayerDefinitions.length - 1 === gameConnections.length) {
            socket.emit('players-finished',currentPlayerDefinitions);
            
            // If this player has already selected an answer
            const playerIndex = playerSelections.findIndex(object => {
                return object.id === id;
            });

            if (playerIndex > -1){
                socket.emit('already-chose-answer');
            }
        }

        socket.emit('show-current-word', currentDeck[wordIndex].word);
    });

    // Checks if the game has started, if it hasnt throws an error and sends users back
    socket.on('check-game-status', () => {
        if (gameConnections.length < 1){ // IF GAME HASN'T STARTED
            io.emit('no-game-playing'); // SEND PLAYERS BACK TO MAIN PAGE
            return;
        }
        
        socket.emit('game-ready'); // IF GAME HAS STARTED, PLAYER STAY ON PAGE
    });

    // Sends the users definition to the server
    socket.on('send-definition', (definition, id) => {
        if (currentPlayerDefinitions.length - 1 === currentConnections.length) return;
        const idIndex = currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (idIndex > -1) return;

        currentPlayerDefinitions.push({definition: definition, id: id, playersChoosing: [], choseCorrect: false});
        console.log('Current player definitions: ',currentPlayerDefinitions);
        if (currentPlayerDefinitions.length === gameConnections.length + 1) {
            io.emit('players-finished', currentPlayerDefinitions);
        }
    });

    // locks in this players answer for which definition they think is correct
    socket.on('lock-in-answer', (id, answer) => {
        if (playerSelections.length >= currentConnections.length ) return;
        const selectionIndex = playerSelections.findIndex(object => {
            return object === id;
        });
        if (selectionIndex < 0) {
            playerSelections.push(id);
        }else{
            return;
        }

        const chosenDefinitionIndex = currentPlayerDefinitions.findIndex(object => {
            return object.id === answer.id;
        });

        const thisPlayerIndex = gameConnections.findIndex(object => {
            return object.id === id;
        });

        const thisDefinitionIndex = currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (answer.definition === currentPlayerDefinitions[0].definition){ // If player chose correct
            gameConnections[thisPlayerIndex].score += 1;
            currentPlayerDefinitions[thisDefinitionIndex].choseCorrect = true;
            currentPlayerDefinitions[0].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }else{ // Chose another players made up definition
            currentPlayerDefinitions[chosenDefinitionIndex].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }

        // when all players have locked in their selections, finalise player scores
        if (playerSelections.length === currentConnections.length){
            for (let i = 1; i < currentPlayerDefinitions.length; i++){
                const tempPlayerIndex = gameConnections.findIndex(object => {
                    return object.id === currentPlayerDefinitions[i].id;
                });

                gameConnections[tempPlayerIndex].score += currentPlayerDefinitions[i].playersChoosing.length;
                console.log(`${gameConnections[tempPlayerIndex].nickname}'s score: ${gameConnections[tempPlayerIndex].score}`);
            }
            console.log('Current player definitions', currentPlayerDefinitions);
            console.log('Game connections', gameConnections);
            io.emit('display-scores');
        }
    });

    //------------------------------------------------------
    //               LOBBY EVENTS
    //------------------------------------------------------

    // Adds players to current connections when joining lobby
    socket.on('add-player', (nickname) => {
        let playerNum = currentConnections.push({id: socket.id, nickname: nickname, ready: false, score: 0});

        socket.emit('show-player-num', playerNum);
        //socket.emit('recieve-word', currentDeck[wordIndex]);
        io.emit('player-joined', currentConnections);
    });
    
    // Tells players another player has readied up, if everyone is ready the game begins
    socket.on('ready-up', () => {
        const index = currentConnections.findIndex(object => {
            return object.id === socket.id;  // Use socket.id as it happens in the lobby
        });

        if (index < 0) return;
        currentConnections[index].ready = !currentConnections[index].ready;
        io.emit('player-ready', currentConnections);//Updates all players player list

        if (gameConnections.length > 0){ // Game in progress
            return;
        }

        const count = currentConnections.filter((obj) => obj.ready === true).length;
        console.log('Amount of ready players: ', count);
        if (count === currentConnections.length){
            Object.assign(gameConnections, currentConnections); // Assign by value not ref
            console.log('game connections',  gameConnections);
            countdown(3);
        }
    });

    // A players client side requests their nickname
    socket.on('request-nickname', (id) => {
        const index = currentConnections.findIndex(object => {
            return object.id === id;
        });

        socket.emit('recieve-nickname',currentConnections[index].nickname);
    });

    socket.on('next-round', (id) => {
        const index = currentConnections.findIndex(object => {
            return object.id === id;
        });

        if (index > -1) nextRoundVote++;
        if (nextRoundVote === gameConnections.length){
            countdown(3);
        }
    });

    socket.on('send-to-lobby', () => {
        resetGameVariables();
        gameConnections = [];
        dealingPlayerIndex = 0;
        io.emit('to-lobby');
    });

    //------------------------------------------------------
    //               SHARED EVENTS
    //------------------------------------------------------


    socket.on('disconnect', () => {
        playerNum = currentConnections.findIndex(object => {
            return object.id === (playerid ? playerid : socket.id);
        }) + 1;
        // Remove player from connections
        currentConnections.splice(playerNum - 1, 1);
        
        socket.broadcast.emit('player-left', currentConnections);

        // Update all players current player number
        io.emit('disconnections', playerNum);

        // If only one or no player(s) left, cancel game
        setTimeout(() => {
            if (currentConnections.length < 2){
                io.emit('no-game-playing');
                gameConnections = [];
                resetGameVariables();
            }
        }, 2000);
    })
});

// Used to display a countdown in seconds
function countdown(countDown){
    io.emit('countdown', countDown);
}

function resetGameVariables(){
    playerSelections = [];
    currentPlayerDefinitions = [];
    numPlayersSubmitted = 0;
    nextRoundVote = 0;
    wordIndex = Math.floor(Math.random() * currentDeck.length);
    currentPlayerDefinitions.push({definition: currentDeck[wordIndex].definition, playersChoosing: []});
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));

module.exports.gameConnections = function () {
    return gameConnections;
}
module.exports.currentPlayerDefinitions = function() {
    return currentPlayerDefinitions;
};