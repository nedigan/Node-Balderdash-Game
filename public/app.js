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

const playerList = document.getElementById('playerlist');
const readyButton = document.getElementById('ready');

function updatePlayerList(connections) {
    playerList.innerHTML = "";
    for (let i = 0; i < connections.length; i++){
        let playerElement = document.createElement("li");
        playerElement.textContent = `Player ${i + 1}: ${connections[i].nickname}`
        playerElement.className = connections[i].ready ? "ready" : "unready";
        playerList.append(playerElement);
    }
}

socket.on('player-joined', (connections) => {
    updatePlayerList(connections);
    // Maybe put stuff later when players join
});
//----------------------------At the moment these two do the same thing
socket.on('player-ready', (connections) => {
    updatePlayerList(connections);
    // Maybe put stuff later when players ready up
});

socket.on('this-player-ready', (player) => {
    if (player.ready) {
        readyButton.textContent = "Unready";
    }else{
        readyButton.textContent = "Ready";
    }
});

socket.on('player-left', (connections) => {
    updatePlayerList(connections);
    // Maybe put stuff later when a player leaves
});

socket.on('countdown', (num) => {
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = num;
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

readyButton.addEventListener('click', () => {
    socket.emit('ready-up');
});
