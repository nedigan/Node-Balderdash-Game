const http = require('http');
const express = require('express');
const path = require('path');
const app = express();
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const words = require('./words.json');

//set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// connections
const mainConnections = [];
let gameConnections = [];

// game variables
let currentPlayerDefintions = [];

// Max Number of players
const maxPlayers = 4;

let wordIndex = Math.floor(Math.random() * words.length);
// Index 0 is correct definition
currentPlayerDefintions.push({definition: words[wordIndex].definition});

// listen for connections
io.on('connection', socket => {
    if (mainConnections.length === maxPlayers){
        console.log('Room is full');
        socket.emit('fullroom');
        return;
    }
    socket.on('player-exists', (id) => {
        // Use game connections
        const index = gameConnections.findIndex(object => {
            return object.id === id;
        });
        console.log(`${gameConnections[index].nickname} has joined the game`);
        mainConnections.push(gameConnections[index]);
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
        currentPlayerDefintions.push({definition: definition, id: id});
        console.log(currentPlayerDefintions);
        if (currentPlayerDefintions.length === maxPlayers + 1) {
            io.emit('players-finished', currentPlayerDefintions);
        }
    });

    socket.on('add-player', (nickname) => {
        let playerNum = mainConnections.push({id: socket.id, nickname: nickname, ready: false});
        console.log(mainConnections);
        socket.emit('show-player-num', playerNum);
        //socket.emit('recieve-word', words[wordIndex]);
        io.emit('player-joined', mainConnections);
    });
    
    // Use socket.id as it happens in the lobby
    socket.on('ready-up', () => {
        const index = mainConnections.findIndex(object => {
            return object.id === socket.id;
        });

        mainConnections[index].ready = !mainConnections[index].ready;
        io.emit('player-ready', mainConnections);//Updates all players player list
        socket.emit('this-player-ready', mainConnections[index]);//Updates this players ready button atm

        const count = mainConnections.filter((obj) => obj.ready === true).length;
        console.log('Amount of ready players: ', count);
        if (count === mainConnections.length){
            Object.assign(gameConnections, mainConnections);
            countdown();
        }
    });

    socket.on('request-nickname', (id) => {
        const index = mainConnections.findIndex(object => {
            return object.id === id;
        });

        socket.emit('recieve-nickname',mainConnections[index].nickname);
    });

    socket.on('disconnect', () => {
        playerNum = mainConnections.findIndex(object => {
            return object.id === socket.id;
        }) + 1;
        // Remove player from connections
        mainConnections.splice(playerNum - 1, 1);
        
        socket.broadcast.emit('player-left', mainConnections);

        // Update all players current player number
        io.emit('disconnections', playerNum);
    })
    /*
    socket.on('send-message', (message) => {
        //const num = connections.indexOf({id: socket.id}) + 1;
        const index = mainConnections.findIndex(object => {
            return object.id === socket.id;
        });
        const nickname = mainConnections[index].nickname;
        io.emit('recieve-message', message, nickname);
    });*/
});

function countdown(){
    const countDown = 3;
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
