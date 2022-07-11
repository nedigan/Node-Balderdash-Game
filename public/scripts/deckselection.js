socket.on('dealing-player', (player) => {
    if (id === player.id){
        chooseDeck();
    }else{
        const waitingForPlayer = document.createElement('h2');
        waitingForPlayer.textContent = `${player.nickname} is selecting a deck...`;

        document.body.append(waitingForPlayer);
    }
});

function chooseDeck(){
    const words = document.createElement('button');
    words.textContent = 'Words';

    const acronyms = document.createElement('button');
    acronyms.textContent = 'Acronyms';

    const buttons = document.querySelector('.buttons');

    buttons.appendChild(words);
    buttons.appendChild(acronyms);

    words.addEventListener('click', () => {
        socket.emit('chosen-deck', 0);
    });

    acronyms.addEventListener('click', () => {
        socket.emit('chosen-deck', 1);
    });
}

socket.on('go-to-game', () => {
    window.location.replace('/game.html');
});