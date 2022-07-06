const socket = io();
const nextRoundButton = document.getElementById('next-round');
const toLobbyButton = document.getElementById('back-to-lobby');

const id =  sessionStorage.getItem('id');
if (id === null){
    window.location.replace('/');
}

socket.on('connect', () => {
    socket.emit('player-exists', id);
});

socket.on('send-to-home', () => {
    window.location.replace('/');
});

socket.on('countdown', (num) => {
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = num;  
});

socket.on('start-game', () => {
    window.location.replace('/game.html');
});

nextRoundButton.addEventListener('click', () => {
    socket.emit('next-round', id)
    playerFinished([nextRoundButton, toLobbyButton])
});

function playerFinished(removeElementList){
    waitingText = document.createElement('h2');
    
    for (let i = 0; i < removeElementList.length; i++){
        removeElementList[i].remove();
    }

    waitingText.textContent = "Waiting for other players..."
    document.body.append(waitingText);
};