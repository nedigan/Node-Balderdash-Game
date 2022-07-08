const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const words = require('./words.json');
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
let numPlayersSubmitted = 0;
let nextRoundVote = 0;

// Max Number of players
const maxPlayers = 4;

let wordIndex = Math.floor(Math.random() * words.length);
// Index 0 is correct definition
currentPlayerDefinitions.push({definition: words[wordIndex].definition, playersChoosing: []});

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
            console.log(`${gameConnections[index].nickname} has already submitted`);
            return;
        }

        socket.emit('show-current-word', words[wordIndex].word);
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
        if (currentPlayerDefinitions.length === maxPlayers + 1) {
            io.emit('players-finished', currentPlayerDefinitions);
        }
    });

    // locks in this players answer for which definition they think is correct
    socket.on('lock-in-answer', (id, answer) => {
        if (numPlayersSubmitted >= currentConnections.length ) return;

        numPlayersSubmitted += 1;
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
            console.log('correct');
            gameConnections[thisPlayerIndex].score += 1;
            currentPlayerDefinitions[thisDefinitionIndex].choseCorrect = true;
            currentPlayerDefinitions[0].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }else{ // Chose another players made up definition
            currentPlayerDefinitions[chosenDefinitionIndex].playersChoosing.push(gameConnections[thisPlayerIndex].nickname);
        }

        // when all players have locked in their selections, finalise player scores
        if (numPlayersSubmitted === currentConnections.length){
            numPlayersSubmitted = 0;
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
        //socket.emit('recieve-word', words[wordIndex]);
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
        socket.emit('this-player-ready', currentConnections[index]);//Updates this players ready button atm

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
            resetGameVariables();
            countdown(3);
        }
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
    })
});

// Used to display a countdown in seconds
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

function resetGameVariables(){
    console.log('RESETTED GAME VARIABLES')
    currentPlayerDefinitions = [];
    numPlayersSubmitted = 0;
    nextRoundVote = 0;
    wordIndex = Math.floor(Math.random() * words.length);
    currentPlayerDefinitions.push({definition: words[wordIndex].definition, playersChoosing: []});
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));

module.exports.gameConnections = gameConnections;
module.exports.currentPlayerDefinitions = function() {
    return currentPlayerDefinitions;
};