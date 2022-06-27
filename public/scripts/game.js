const socket = io();
const id =  sessionStorage.getItem('id');
let nickname = sessionStorage.getItem('nickname');

socket.on('connect', () => {
   socket.emit('check-game-status');
});

socket.on('game-ready', () => {
    socket.emit('player-exists', id);
    socket.emit('request-nickname', id);
});

socket.on('fullroom', () => {
    window.location.replace("/fullroom.html");
});

socket.on('recieve-nickname', (nick) => {
    nickname = nick;
});

socket.on('no-game-playing', () =>{
    window.location.replace('/index.html');
});

if (!nickname){
    window.location.replace('/index.html');
}

let title = document.getElementById('title');
title.textContent = nickname;