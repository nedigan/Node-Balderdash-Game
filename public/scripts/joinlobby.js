const join = document.getElementById('join');
let nicknameField = document.getElementById('nickname');

join.addEventListener('click', () => {
    let nickname = nicknameField.value;
    console.log('Clicked');
    //if (nickname === "") return;
    console.log('IDK');
    window.location.href = `/lobby.html?nickname=${nickname}`;
});