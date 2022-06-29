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
let waitingText = document.createElement('h2');

textbox.addEventListener('keypress', (event) => {
    if (event.key === 'Enter')  {
        event.preventDefault();
        doneButton.click();
    }
});

doneButton.addEventListener('click', () => {
    let definition = textbox.value;
    playerFinished();
    socket.emit('send-definition', definition, id);
    textbox.value = "";
});

socket.on('show-current-word', (word) => {
    wordName.textContent = `Word: ${word}`;
});

socket.on('players-finished', (definitions) => {
    const correctDefinition = definitions[0];
    // Randomly suffle the definitions
    definitions.sort(() => Math.random() - 0.5);
    const list = displayDefinitions(definitions);
    let selectedDefinition = list.children[0]; // Default is first index so player cant not select one
    list.children[0].className = 'selected'; // makes text yellow to indicate selection

    for (let i = 0, len = list.children.length; i < len; i++)
    {
        list.children[i].onclick = function(){
            selectDefiniton(selectedDefinition, list.children[i]);
            selectedDefinition = list.children[i];
        }
    }

});

function selectDefiniton(prev, current){
    // Only be able to select one
    if (prev) prev.className = '';
    current.className = 'selected';
}

function displayDefinitions(definitions){
    waitingText.remove();
    const centreDiv = document.getElementById('centre');

    const definitionsList = document.createElement('ul');
    definitionsList.className = 'verticalList';
    for (let i = 0; i < definitions.length; i++){
        let definition = document.createElement('li');
        definition.textContent = definitions[i].definition;
        definitionsList.appendChild(definition);
    }
    // Add list to screen
    centreDiv.appendChild(definitionsList);

    // Add select button to screen
    const buttonsDiv = document.querySelector('.buttons');
    const answerButton = document.createElement('button');
    answerButton.id = 'select';
    answerButton.textContent = 'Select';
    centreDiv.appendChild(buttonsDiv);
    buttonsDiv.appendChild(answerButton);

    return definitionsList;
};

function playerFinished(){
    doneButton.remove();
    textbox.remove();
    wordName.remove();

    waitingText.textContent = "Waiting for other players..."
    document.body.append(waitingText);
};