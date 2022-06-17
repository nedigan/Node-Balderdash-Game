const socket = io();

let urlParams = new URLSearchParams(window.location.search);
const nickname = urlParams.get('nickname');
if (!nickname){
    window.location.replace("/index.html");
}
socket.emit('nickname', nickname);

socket.on('show-player-num', (num) => {
    changePlayerNum(num);  

    socket.on('disconnections', (disconnected) => {
        if (num > disconnected){
            num -= 1;
            changePlayerNum(num);
        }
    });
});

socket.on('fullroom', () => {
    window.location.replace("/fullroom.html");
});

function changePlayerNum(number){
    document.getElementById('player-num').innerHTML = `YOU ARE PLAYER ${number}!`
}  

let messages = document.getElementById("messages");
let textbox = document.getElementById("textbox");
let button = document.getElementById("send");
let newWordButton = document.getElementById("new-word");

textbox.addEventListener('keypress', (event) => {
    if (event.key === 'Enter')  {
        button.click();
    }
});

socket.on('recieve-message', (message, nickname) => {
    displayMessage(message, nickname);
});

socket.on('recieve-word', (word) => {
    document.getElementById('word').textContent = `Word: ${word.word.trim()}`;
    document.getElementById('definition').textContent = `Definition: ${word.definition.trim()}`;
});

function displayMessage(message, nickname){
    let newMessage = document.createElement("li");
    newMessage.textContent = `${nickname}: ${message}`;
    messages.prepend(newMessage);
}

button.addEventListener('click', () => {
    if (textbox.value === "") return;
    socket.emit('send-message', textbox.value)
    textbox.value = "";
});

newWordButton.addEventListener('click', () => {socket.emit('new-word');});