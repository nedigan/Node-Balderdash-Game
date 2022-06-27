// NETWORKING CODE

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

// GAME CODE

const doneButton = document.getElementById('done');
const textbox = document.getElementById('textbox');
const wordName = document.getElementById('word');

textbox.addEventListener('keypress', (event) => {
    if (event.key === 'Enter')  {
        event.preventDefault();
        doneButton.click();
    }
});

doneButton.addEventListener('click', () => {
    let definition = textbox.value;
    socket.emit('send-definition', definition, id);
    textbox.value = "";
});

socket.on('show-current-word', (word) => {
    wordName.textContent = `Word: ${word}`;
});