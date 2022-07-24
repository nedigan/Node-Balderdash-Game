const socket = io();
const nextRoundButton = document.getElementById('next-round');
const toLobbyButton = document.getElementById('back-to-lobby');
const nickname = sessionStorage.getItem('nickname');

const id =  sessionStorage.getItem('id');
const serverId = sessionStorage.getItem('serverId');

if (id === null){
    window.location.replace('/');
}

socket.on('connect', () => {
    socket.emit('assign-server', serverId);
    socket.emit('player-exists', id);   
});

socket.on('countdown', (num) => {
    const countdownElement = document.getElementById('countdown');

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

socket.on('start-game', () => {
    window.location.replace('/game.html');
});

socket.on('to-lobby', () => {
    window.location.replace(`/lobby.html?nickname=${nickname}`);
});

nextRoundButton.addEventListener('click', () => {
    socket.emit('next-round', id)
    playerFinished([nextRoundButton, toLobbyButton])
});

toLobbyButton.addEventListener('click', () => {
    socket.emit('send-to-lobby');
});

function playerFinished(removeElementList){
    waitingText = document.createElement('h2');
    
    for (let i = 0; i < removeElementList.length; i++){
        removeElementList[i].remove();
    }

    waitingText.textContent = "Waiting for other players..."
    document.body.append(waitingText);
};