const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const words = require('./words.json');
const scores = require('./routes/scores');
const { setUncaughtExceptionCaptureCallback } = require('process');


//set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine','pug');
app.use(express.json());
app.use('/scores', scores);

// connections
const currentConnections = [];
let gameConnections = [];

// game variables
let currentPlayerDefintions = [];
let numPlayersSubmitted = 0;

// Max Number of players
const maxPlayers = 4;

let wordIndex = Math.floor(Math.random() * words.length);
// Index 0 is correct definition
currentPlayerDefintions.push({definition: words[wordIndex].definition, playersChoosing: []});

// listen for connections
io.on('connection', socket => {
    let playerid = null;
    if (currentConnections.length === maxPlayers){
        console.log('Room is full');
        socket.emit('fullroom');
        return;
    }
    socket.on('player-exists', (id) => {
        // Use game connections
        const index = gameConnections.findIndex(object => {
            return object.id === id;
        });

        const defIndex = currentPlayerDefintions.findIndex(object => {
            return object.id === id;
        });

        currentConnections.push(gameConnections[index]);
        playerid = id;

        // If the player has reconnected and already submitted
        if (defIndex > -1){
            socket.emit('already-submitted');
            console.log(`${gameConnections[index].nickname} has already submitted`);
            return;
        }

        console.log(`${gameConnections[index].nickname} has joined the game`);
        socket.emit('show-current-word', words[wordIndex].word);
    });

    socket.on('check-game-status', () => {
        if (gameConnections.length < 1){ // IF GAME HASN'T STARTED
            io.emit('no-game-playing'); // SEND PLAYERS BACK TO MAIN PAGE
            return;
        }
        
        socket.emit('game-ready'); // IF GAME HAS STARTED, PLAYER STAY ON PAGE
    });

    socket.on('send-definition', (definition, id) => {
        if (currentPlayerDefintions.length - 1 === currentConnections.length) return;

        currentPlayerDefintions.push({definition: definition, id: id, playersChoosing: []});
        console.log(currentPlayerDefintions);
        if (currentPlayerDefintions.length === maxPlayers + 1) {
            io.emit('players-finished', currentPlayerDefintions);
        }
    });

    socket.on('lock-in-answer', (id, answer) => {
        if (numPlayersSubmitted >= currentConnections.length ) return;

        numPlayersSubmitted += 1;
        const chosenDefinitionIndex = currentPlayerDefintions.findIndex(object => {
            return object.id === answer.id;
        });

        const thisPlayerIndex = gameConnections.findIndex(object => {
            return object.id === id;
        });

        if (answer.definition === currentPlayerDefintions[0].definition){ // If player chose correct
            console.log('correct');
            gameConnections[thisPlayerIndex].score += 1;
            currentPlayerDefintions[0].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }else{ // Chose another players made up definition
            currentPlayerDefintions[chosenDefinitionIndex].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }

        // when all players have locked in their selections, finalise player scores
        if (numPlayersSubmitted === currentConnections.length){
            for (let i = 1; i < currentPlayerDefintions.length; i++){
                const tempPlayerIndex = gameConnections.findIndex(object => {
                    return object.id === currentPlayerDefintions[i].id;
                });

                gameConnections[tempPlayerIndex].score += currentPlayerDefintions[i].playersChoosing.length;
                console.log(`${gameConnections[tempPlayerIndex].nickname}'s score: ${gameConnections[tempPlayerIndex].score}`);
            }
            console.log(currentPlayerDefintions);
            io.emit('display-scores');
        }
    });

    socket.on('add-player', (nickname) => {
        let playerNum = currentConnections.push({id: socket.id, nickname: nickname, ready: false, score: 0});
        console.log(currentConnections);
        socket.emit('show-player-num', playerNum);
        //socket.emit('recieve-word', words[wordIndex]);
        io.emit('player-joined', currentConnections);
    });
    
    // Use socket.id as it happens in the lobby
    socket.on('ready-up', () => {
        const index = currentConnections.findIndex(object => {
            return object.id === socket.id;
        });

        currentConnections[index].ready = !currentConnections[index].ready;
        io.emit('player-ready', currentConnections);//Updates all players player list
        socket.emit('this-player-ready', currentConnections[index]);//Updates this players ready button atm

        const count = currentConnections.filter((obj) => obj.ready === true).length;
        console.log('Amount of ready players: ', count);
        if (count === currentConnections.length){
            Object.assign(gameConnections, currentConnections); // Assign by value not ref
            countdown(3);
        }
    });

    socket.on('request-nickname', (id) => {
        const index = currentConnections.findIndex(object => {
            return object.id === id;
        });

        socket.emit('recieve-nickname',currentConnections[index].nickname);
    });

    socket.on('disconnect', () => {
        playerNum = currentConnections.findIndex(object => {
            return object.id === playerid ? playerid : socket.id;
        }) + 1;
        console.log('DISCONNECTED');
        // Remove player from connections
        currentConnections.splice(playerNum - 1, 1);
        
        socket.broadcast.emit('player-left', currentConnections);

        // Update all players current player number
        io.emit('disconnections', playerNum);
    })
});

function countdown(countDown){
    let count = countDown;
    let interval = setInterval(() => {
        if (count === 0){
            clearInterval(interval);
            io.emit('start-game');
            return
        }
        console.log(count);
        io.emit('countdown', count--);
    }, 1000);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));


module.exports.totalPlayerScores = gameConnections;
module.exports.currentPlayerScores = currentPlayerDefintions;

