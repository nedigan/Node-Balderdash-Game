// NETWORKING CODE

const socket = io();
const id =  sessionStorage.getItem('id');
let nickname = sessionStorage.getItem('nickname');

// Asks server if the game is ready
socket.on('connect', () => {
    socket.emit('check-game-status');
 });

// Game is ready, now can start other processes
socket.on('game-ready', () => {
    socket.emit('player-exists', id); // Check if player exists
    socket.emit('request-nickname', id);  // Get player nickname
});

socket.on('fullroom', () => {
    window.location.replace("/fullroom.html");
});

socket.on('recieve-nickname', (nick) => {
    nickname = nick;
});

socket.on('no-game-playing', () =>{
    window.location.replace('/');
});

if (!nickname){
    window.location.replace('/');
}