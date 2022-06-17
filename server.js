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

    let playerNum = connections.push(socket.id);
    console.log(`Player ${playerNum} has joined!`);
    socket.emit('show-player-num', playerNum);
    socket.emit('recieve-word', words[wordIndex]);
    socket.emit('connected');

    socket.on('disconnect', () => {
        playerNum = connections.indexOf(socket.id) + 1;
        connections.splice(playerNum - 1, 1);
        io.emit('disconnections', playerNum);
        console.log(`Player ${playerNum} disconnected!`);
    })

    socket.on('send-message', (message) => {
        const num = connections.indexOf(socket.id) + 1;
        io.emit('recieve-message', message, num);
    });

    socket.on('new-word', () => {
        let wordIndex = Math.floor(Math.random() * words.length);
        io.emit('recieve-word', words[wordIndex]);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sever listening on port ${PORT}`));
