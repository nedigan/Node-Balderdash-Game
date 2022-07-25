const socket = io();
const serverId =  sessionStorage.getItem('serverId');

let urlParams = new URLSearchParams(window.location.search);
const nickname = urlParams.get('nickname');
if (!nickname || !serverId){
    window.location.replace("/");
}

document.getElementById('code').textContent = `CODE: ${serverId}`;

socket.on('connect', () => {
    socket.emit('assign-server', serverId);
    socket.emit('add-player', nickname);
    sessionStorage.setItem('id', socket.id);
    sessionStorage.setItem('nickname', nickname);
});

socket.on('invalid-server', () => {
    window.location.replace("/");
});

socket.on('fullroom', () => {
    window.location.replace("/fullroom.html");
}); 

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

socket.on('player-left', (connections) => {
    updatePlayerList(connections);
    // Maybe put stuff later when a player leaves
});

socket.on('countdown', (num) => {
    const countdownElement = document.getElementById('countdown');
    readyButton.remove();

    let interval = setInterval(() => {
        if (num === 0){
            clearInterval(interval);
            window.location.replace("/deckselection.html");
            return;
        }

        countdownElement.textContent = num; 
        num--;
    }, 1000); 
});

readyButton.addEventListener('click', () => {
    socket.emit('ready-up');

    if (readyButton.textContent === "Ready") {
        readyButton.textContent = "Unready";
    }else{
        readyButton.textContent = "Ready";
    }
});
