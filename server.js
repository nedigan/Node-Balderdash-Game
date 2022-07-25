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
const { all } = require('./routes/scores');


//set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine','pug');
app.use(express.json());
app.use('/scores', scores);

// Shared variables between servers
const maxPlayers = 4;
const allDecks = [words, acronyms];

// Servers
const servers = [];

// listen for connections
io.on('connection', socket => {
    let currentServer = null;

    let playerid = null;

    //------------------------------------------------------
    //               GAME EVENTS
    //------------------------------------------------------
    
    socket.on('chosen-deck', (deckIndex) => {
        currentServer.currentDeck = allDecks[deckIndex];
        resetGameVariables(currentServer);
        currentServer.dealingPlayerIndex += 1;
        if (currentServer.dealingPlayerIndex > currentServer.gameConnections.length - 1) currentServer.dealingPlayerIndex = 0; // wrap around
        io.to(currentServer.id).emit('go-to-game');
    });

    // Checks if the player exists in the lobby and calls events accordingly
    socket.on('player-exists', (id) => {
        // Use game connections
        const index = currentServer.gameConnections.findIndex(object => {
            return object.id === id;
        });

        const defIndex = currentServer.currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (index > -1){
            currentServer.currentConnections.push(currentServer.gameConnections[index]);
            playerid = id;   
        }else{
            socket.emit('send-to-home');
        }
        
        // If the player has reconnected and already submitted
        if (defIndex > -1){
            socket.emit('already-submitted');
        }

        // If all players have already submitted definitions
        if (currentServer.currentPlayerDefinitions.length - 1 === currentServer.gameConnections.length) {
            socket.emit('players-finished',currentServer.currentPlayerDefinitions);
            
            // If this player has already selected an answer
            const playerIndex = currentServer.playerSelections.findIndex(object => {
                return object.id === id;
            });

            if (playerIndex > -1){
                socket.emit('already-chose-answer');
            }
        }

        socket.emit('show-current-word', currentServer.currentDeck[currentServer.wordIndex].word);
    });

    // Checks if the game has started, if it hasnt throws an error and sends users back
    socket.on('check-game-status', () => {
        if (currentServer.gameConnections.length < 1){ // IF GAME HASN'T STARTED
            io.to(currentServer.id).emit('no-game-playing'); // SEND PLAYERS BACK TO MAIN PAGE
            return;
        }

        if (currentServer.gameConnections.length > 0){
            socket.emit('dealing-player', currentServer.gameConnections[currentServer.dealingPlayerIndex]);   
        }
        
        socket.emit('game-ready'); // IF GAME HAS STARTED, PLAYER STAY ON PAGE
    });

    // Sends the users definition to the server
    socket.on('send-definition', (definition, id) => {
        if (currentServer.currentPlayerDefinitions.length - 1 === currentServer.currentConnections.length) return;
        const idIndex = currentServer.currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (idIndex > -1) return;

        currentServer.currentPlayerDefinitions.push({definition: definition, id: id, playersChoosing: [], choseCorrect: false});
        console.log('Current player definitions: ',currentServer.currentPlayerDefinitions);
        if (currentServer.currentPlayerDefinitions.length === currentServer.gameConnections.length + 1) {
            io.to(currentServer.id).emit('players-finished', currentServer.currentPlayerDefinitions);
        }
    });

    // locks in this players answer for which definition they think is correct
    socket.on('lock-in-answer', (id, answer) => {
        if (currentServer.playerSelections.length >= currentServer.currentConnections.length ) return;
        const selectionIndex = currentServer.playerSelections.findIndex(object => {
            return object === id;
        });
        if (selectionIndex < 0) {
            currentServer.playerSelections.push(id);
        }else{
            return;
        }

        const chosenDefinitionIndex = currentServer.currentPlayerDefinitions.findIndex(object => {
            return object.id === answer.id;
        });

        const thisPlayerIndex = currentServer.gameConnections.findIndex(object => {
            return object.id === id;
        });

        const thisDefinitionIndex = currentServer.currentPlayerDefinitions.findIndex(object => {
            return object.id === id;
        });

        if (answer.definition === currentServer.currentPlayerDefinitions[0].definition){ // If player chose correct
            currentServer.gameConnections[thisPlayerIndex].score += 1;
            currentServer.currentPlayerDefinitions[thisDefinitionIndex].choseCorrect = true;
            currentServer.currentPlayerDefinitions[0].playersChoosing.push(currentServer.gameConnections[thisPlayerIndex].nickname);
        }else{ // Chose another players made up definition
            currentServer.currentPlayerDefinitions[chosenDefinitionIndex].playersChoosing.push(currentServer.gameConnections[thisPlayerIndex].nickname);
        }

        // when all players have locked in their selections, finalise player scores
        if (currentServer.playerSelections.length === currentServer.currentConnections.length){
            for (let i = 1; i < currentServer.currentPlayerDefinitions.length; i++){
                const tempPlayerIndex = currentServer.gameConnections.findIndex(object => {
                    return object.id === currentServer.currentPlayerDefinitions[i].id;
                });

                currentServer.gameConnections[tempPlayerIndex].score += currentServer.currentPlayerDefinitions[i].playersChoosing.length;
                console.log(`${currentServer.gameConnections[tempPlayerIndex].nickname}'s score: ${currentServer.gameConnections[tempPlayerIndex].score}`);
            }
            console.log('Current player definitions', currentServer.currentPlayerDefinitions);
            console.log('Game connections', currentServer.gameConnections);
            io.to(currentServer.id).emit('display-scores');
        }
    });

    //------------------------------------------------------
    //               LOBBY EVENTS
    //------------------------------------------------------

    // Adds players to current connections when joining lobby
    socket.on('add-player', (nickname) => {
        if (currentServer.currentConnections.length === maxPlayers){
            console.log('Room is full');
            socket.emit('fullroom');
            return;
        }

        let playerNum = currentServer.currentConnections.push({id: socket.id, nickname: nickname, ready: false, score: 0});

        socket.emit('show-player-num', playerNum);
        //socket.emit('recieve-word', currentDeck[wordIndex]);
        io.to(currentServer.id).emit('player-joined', currentServer.currentConnections);
    });
    
    // Tells players another player has readied up, if everyone is ready the game begins
    socket.on('ready-up', () => {
        const index = currentServer.currentConnections.findIndex(object => {
            return object.id === socket.id;  // Use socket.id as it happens in the lobby
        });

        if (index < 0) return;
        currentServer.currentConnections[index].ready = !currentServer.currentConnections[index].ready;
        io.to(currentServer.id).emit('player-ready', currentServer.currentConnections);//Updates all players player list

        if (currentServer.gameConnections.length > 0){ // Game in progress
            return;
        }

        const count = currentServer.currentConnections.filter((obj) => obj.ready === true).length;
        console.log('Amount of ready players: ', count);
        if (count === currentServer.currentConnections.length){
            Object.assign(currentServer.gameConnections, currentServer.currentConnections); // Assign by value not ref
            console.log('game connections',  currentServer.gameConnections);
            countdown(3, currentServer);
        }
    });

    // A players client side requests their nickname
    socket.on('request-nickname', (id) => {
        console.log(currentServer.currentConnections);
        const index = currentServer.currentConnections.findIndex(object => {
            return object.id === id;
        });

        socket.emit('recieve-nickname',currentServer.currentConnections[index].nickname);
    });

    socket.on('next-round', (id) => {
        const index = currentServer.currentConnections.findIndex(object => {
            return object.id === id;
        });

        if (index > -1) currentServer.nextRoundVote++;
        if (currentServer.nextRoundVote === currentServer.gameConnections.length){
            countdown(3, currentServer);
        }
    });

    socket.on('send-to-lobby', () => {
        resetGameVariables(currentServer);
        currentServer.gameConnections = [];
        currentServer.dealingPlayerIndex = 0;
        io.to(currentServer.id).emit('to-lobby');
    });

    socket.on('is-code-valid', (code) => {
        const server = servers.find((object) => {
            return object.id === code;
        });
        socket.emit('send-code-status', server === undefined);
    });

    socket.on('create-server', () => {
        let code = 0;
        gotUniqueCode = false;
        while (gotUniqueCode === false){
            code = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000; // RANDOM CODE

            const index = servers.findIndex((object) => {
                return object.id === code;
            });

            if (index < 0) gotUniqueCode = true;
        }
        code = code.toString();

        const server = {};
        server.id = code;
        server.currentConnections = [];
        server.gameConnections  = [];
        server.currentPlayerDefinitions = [];
        server.playerSelections = [];
        server.nextRoundVote = 0;
        server.dealingPlayerIndex = 0;
        server.currentDeck = allDecks[0];
        server.wordIndex = Math.floor(Math.random() * server.currentDeck.length);
        servers.push(server);

        currentServer = server;
        socket.join(code);

        console.log("Server Created!");
        socket.emit('server-created', code);
    });

    socket.on('assign-server', (code) => {
        currentServer = servers.find((object) =>{
            return object.id === code;
        });
        socket.join(code);
    });

    //------------------------------------------------------
    //               SHARED EVENTS
    //------------------------------------------------------


    socket.on('disconnect', () => {
        if (currentServer === null) return;

        playerNum = currentServer.currentConnections.findIndex(object => {
            return object.id === (playerid ? playerid : socket.id);
        }) + 1;
        // Remove player from connections
        currentServer.currentConnections.splice(playerNum - 1, 1);
        
        socket.to(currentServer.id).emit('player-left', currentServer.currentConnections);

        // Update all players current player number
        io.to(currentServer.id).emit('disconnections', playerNum);

        // If only one or no player(s) left, cancel game
        setTimeout(() => {
            if (currentServer.currentConnections.length < 2){
                io.to(currentServer.id).emit('no-game-playing');
                currentServer.gameConnections = [];
                resetGameVariables(currentServer);
            }
        }, 2000);
    })
});

// Used to display a countdown in seconds
function countdown(countDown, currentServer){
    io.to(currentServer.id).emit('countdown', countDown);
}

function resetGameVariables(currentServer){
    currentServer.playerSelections = [];
    currentServer.currentPlayerDefinitions = [];
    currentServer.numPlayersSubmitted = 0;
    currentServer.nextRoundVote = 0;
    currentServer.wordIndex = Math.floor(Math.random() * currentServer.currentDeck.length);
    currentServer.currentPlayerDefinitions.push({definition: currentServer.currentDeck[currentServer.wordIndex].definition, playersChoosing: []});
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));

module.exports.io = function () {
    return io;
}

module.exports.servers = function () {
    return servers;
}
