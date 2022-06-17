const socket = io();

socket.on('show-player-num', (num) => {
    playerNum = num;
    changePlayerNum(num);  

    socket.on('disconnections', (disconnected) => {
        if (num > disconnected){
            num -= 1;
            playerNum = num;
            changePlayerNum(num);
        }
    });
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

socket.on('recieve-message', (message, num) => {
    displayMessage(message, num);
});

socket.on('recieve-word', (word) => {
    document.getElementById('word').textContent = `Word: ${word.word.trim()}`;
    document.getElementById('definition').textContent = `Definition: ${word.definition.trim()}`;
});

function displayMessage(message, num){
    let newMessage = document.createElement("li");
    newMessage.textContent = `Player ${num}: ${message}`;
    messages.prepend(newMessage);
}

button.addEventListener('click', () => {
    if (textbox.value === "") return;
    socket.emit('send-message', textbox.value)
    textbox.value = "";
});

newWordButton.addEventListener('click', () => {socket.emit('new-word');});