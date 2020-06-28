const express = require('express'),
    transactionIdentifier = express.Router();
var fs = require('fs');

transactionIdentifier.post('/add', (request, response) => {
    let entry = request.body.entry;
    entry = '\n' + entry;

    fs.appendFileSync("corma-transaction-identifier/res/identificationMap.csv", entry, 'utf8');

    response.json({success: true});
});

module.exports = transactionIdentifier;