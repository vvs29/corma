const express = require('express'),
    api = express.Router();
var fs = require('fs');

api.post('/process_transactions',(request, response)=>{
    response.header('Content-Type', 'text/csv');
    response.header('Content-Disposition', 'attachment; filename="mappings.csv"')
    response.send(request.body.mappings);
});

api.get('/suggestions',(request, response)=>{
    var suggestionsJSON = JSON.parse(fs.readFileSync('./blah.json', 'utf8'));
    response.json(suggestionsJSON);
});

module.exports = api;