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
const connections = [];

// Max Number of players
const maxPlayers = 4;

let wordIndex = 0;
// listen for connections
io.on('connection', socket => {
    
    if (connections.length === maxPlayers){
        console.log('Room is full');
        socket.emit('fullroom');
        return;
    }

    socket.on('nickname', (nickname) => {
        let playerNum = connections.push({id: socket.id, nickname: nickname, ready: false});
        console.log(`Player ${playerNum} has joined!`);
        console.log(connections);
        socket.emit('show-player-num', playerNum);
        //socket.emit('recieve-word', words[wordIndex]);
        io.emit('player-joined', connections);
    });
    
    socket.on('ready-up', () => {
        const index = connections.findIndex(object => {
            return object.id === socket.id;
        });

        connections[index].ready = !connections[index].ready;
        io.emit('player-ready', connections);//Updates all players player list
        socket.emit('this-player-ready', connections[index]);//Updates this players ready button atm

        const count = connections.filter((obj) => obj.ready === true).length;
        console.log('Amount of ready players: ', count);
        if (count === connections.length){
            countdown();
        }
    });

    socket.on('disconnect', () => {
        playerNum = connections.findIndex(object => {
            return object.id === socket.id;
        }) + 1;

        // Remove player from connections
        connections.splice(playerNum - 1, 1);
        
        socket.broadcast.emit('player-left', connections);

        // Update all players current player number
        io.emit('disconnections', playerNum);
        console.log(`Player ${playerNum} disconnected!`);
    })

    socket.on('send-message', (message) => {
        //const num = connections.indexOf({id: socket.id}) + 1;
        const index = connections.findIndex(object => {
            return object.id === socket.id;
        });
        const nickname = connections[index].nickname;
        io.emit('recieve-message', message, nickname);
    });

    socket.on('new-word', () => {
        wordIndex = Math.floor(Math.random() * words.length);
        io.emit('recieve-word', words[wordIndex]);
    });
});

function countdown(){
    const countDown = 3;
    let count = countDown;
    let interval = setInterval(() => {
        if (count === 0){
            clearInterval(interval);
        }
        io.emit('countdown', count--)
    }, 1000);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));
