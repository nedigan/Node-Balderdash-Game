socket.on('request-current-time', (time) => {
    countdown(time);
});


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

socket.on('already-submitted', () => {
    playerFinished([doneButton, textbox]);

    removeLoadingScreen();
});

let interval = null;
function countdown(num){
    const countdownElement = document.getElementById('countdown');
    
    interval = setInterval(() => {
        if (num === 0){
            clearInterval(interval);
            return;
        }

        countdownElement.textContent = `Time: ${num}`; 
        num--;
    }, 1000); 
}

doneButton.addEventListener('click', () => {
    let definition = textbox.value;
    playerFinished([doneButton, textbox]);
    socket.emit('send-definition', definition, id);
    textbox.value = "";
});

socket.on('show-current-word', (word) => {
    wordName.textContent = `Word: ${word}`;

    removeLoadingScreen();
});

function removeLoadingScreen(){
    const loader = document.querySelector(".page-loader-component");
    loader.style.opacity = 0;

    setTimeout(function(){
	    loader.style.display = "none"
	}, 1000)
}

let selectedDefinitionIndex = null;

socket.on('players-finished', (definitions) => {
    waitingText.innerHTML = "";
    const correctDefinition = definitions[0];
    clearInterval(interval);
    // Randomly suffle the definitions
    definitions.sort(() => Math.random() - 0.5);
    const list = displayDefinitions(definitions, correctDefinition);
    selectedDefinitionIndex = 0; // Default is first index so player cant not select one
    list.children[0].className = 'selected'; // makes text yellow to indicate selection

    for (let i = 0, len = list.children.length; i < len; i++)
    {
        list.children[i].onclick = function(){
            selectDefiniton(list.children[selectedDefinitionIndex], list.children[i]);
            selectedDefinitionIndex = i;
        }
    }

});

socket.on('display-scores', () => {
    window.location.replace('/scores');
});

function selectDefiniton(prev, current){
    // Only be able to select one
    if (prev) prev.className = '';
    current.className = 'selected';
}

function displayDefinitions(definitions, correctDefinition){
    const centreDiv = document.getElementById('centre');

    const definitionsList = document.createElement('ul');
    definitionsList.className = 'vertical-list button-list';
    for (let i = 0; i < definitions.length; i++){
        if (definitions[i].id === id) continue; // Dont show own
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

    // Lock in answer
    answerButton.addEventListener('click', () => {
        socket.emit('lock-in-answer', id, definitions[selectedDefinitionIndex]);
        playerFinished([answerButton, definitionsList]);
    });

    return definitionsList;
};

socket.on('already-chose-answer', () => {
    playerFinished([document.getElementById('select'), definitionsList]);
});

function playerFinished(removeElementList){
    for (let i = 0; i < removeElementList.length; i++){
        removeElementList[i].remove();
    }

    waitingText.textContent = "Waiting for other players..."
    document.body.append(waitingText);
};