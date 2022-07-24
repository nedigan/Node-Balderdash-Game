const express = require('express');
const router = express.Router();
const data = require('../server.js');
const clone = require('lodash.clonedeep');



router.get('/:id', (req, res) => {
    const servers = data.servers();

    let scores = null;
    let definitions = null;

    const server = servers.find((object) => {
        return object.id === req.params.id; 
    }); 
    
    if (server){
        scores = clone(server.gameConnections);
        definitions = server.currentPlayerDefinitions;
    }

    if (!scores || !definitions){
        res.redirect('/');
        return;
    }

    //const scoresCopy = clone(scores.gameConnections());
    //const definitions = scores.currentPlayerDefinitions();
    if (scores.length === 0 || definitions.length === 0){
        res.redirect('/');
        return;
    }
    // Assign current scores to gameConnections in seperate property
    for (let i = 0; i < scores.length; i++){
        let currentScoreIndex = definitions.findIndex(object => {
            return object.id === scores[i].id;
        });

        // Pass players who chose this players definition to gameConnections to show them on the score board
        scores[i].playersChoosing = definitions[currentScoreIndex].playersChoosing;
        scores[i].choseCorrect = definitions[currentScoreIndex].choseCorrect;
    }

    res.render('scores', { title: 'Scoreboard', players: scores, word: definitions[0]});
});

module.exports = router;

// MESSY- BUT IF IT WORKS IT WORKS OK