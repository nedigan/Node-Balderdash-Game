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

socket.on('countdown', (num) => {
    const countdownElement = document.getElementById('countdown');

    let interval = setInterval(() => {
        if (num === 0){
            clearInterval(interval);
            window.location.replace("/game.html");
            return;
        }

        countdownElement.textContent = num; 
        num--
    }, 1000); 
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