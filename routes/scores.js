const express = require('express');
const router = express.Router();
const scores = require('../server.js');

router.get('/', (req, res) => {
    if (scores.gameConnections.length === 0){
        res.redirect('/index.html');
        return;
    }
    res.render('scores', { title: 'Scoreboard', players: scores.gameConnections});
});

module.exports = router;