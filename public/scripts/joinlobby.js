const socket = io();
const join = document.getElementById('join');
const create = document.getElementById('create');
const code = document.getElementById('code');
const nicknameField = document.getElementById('nickname');

join.addEventListener('click', () => {
    if (code.value === "" || code.value === null || code.value.length < 6){
        alert('Code must be at least 6 digits!');
        return;
    }
    socket.emit('is-code-valid', code.value);
});

create.addEventListener('click', () => {
    socket.emit('create-server');
});

socket.on('server-created', (code) => {
    sessionStorage.setItem('serverId', code);

    let nickname = nicknameField.value;
    window.location.href = `/lobby.html?nickname=${nickname}`;
});

socket.on('send-code-status', (isCodeUndefined) => {
    if (isCodeUndefined){
        alert('The entered code is invalid');
    }else{
        let nickname = nicknameField.value;
        window.location.href = `/lobby.html?nickname=${nickname}`;
        sessionStorage.setItem('serverId', code.value);
    }
});