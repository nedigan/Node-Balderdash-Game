const express = require('express');
const router = express.Router();
const scores = require('../server.js');
const clone = require('lodash.clonedeep');

router.get('/', (req, res) => {
    const scoresCopy = clone(scores.gameConnections);
    const definitions = scores.currentPlayerDefinitions();
   /* if (scores.gameConnections.length === 0 || scores.currentPlayerDefinitions.length === 0){
        res.redirect('/index.html');
        return;
    }*/
    // Assign current scores to gameConnections in seperate property
    for (let i = 0; i < scores.gameConnections.length; i++){
        currentScoreIndex = definitions.findIndex(object => {
            return object.id === scores.gameConnections[i].id;
        });

        // Pass players who chose this players definition to gameConnections to show them on the score board
        scoresCopy[i].playersChoosing = definitions[currentScoreIndex].playersChoosing;
        scoresCopy[i].choseCorrect = definitions[currentScoreIndex].choseCorrect;
    }

    res.render('scores', { title: 'Scoreboard', players: scoresCopy});
});

module.exports = router;

// MESSY- BUT IF IT WORKS IT WORKS OK