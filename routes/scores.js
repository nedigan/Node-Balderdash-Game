const express = require('express');
const router = express.Router();
const scores = require('../server.js');

router.get('/', (req, res) => {
    if (scores.totalPlayerScores.length === 0 || scores.currentPlayerScores.length === 0){
        res.redirect('/index.html');
        return;
    }
    // Assign current scores to totalPlayerScores in seperate property
    for (let i = 0; i < scores.totalPlayerScores.length; i++){
        currentScoreIndex = scores.currentPlayerScores.findIndex(object => {
            return object.id === scores.totalPlayerScores[i].id;
        });

        // Pass players who chose this players definition to totalPlayerScores to show them on the score board
        scores.totalPlayerScores[i].playersChoosing = scores.currentPlayerScores[currentScoreIndex].playersChoosing;
    }

    res.render('scores', { title: 'Scoreboard', players: scores.totalPlayerScores});
});

module.exports = router;