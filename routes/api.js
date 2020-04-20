const express = require('express'),
    api = express.Router();

api.post('/process_transactions',(request, response)=>{
    console.log('venk010:' + request.body.mappings);

    response.header('Content-Type', 'text/csv');
    response.header('Content-Disposition', 'attachment; filename="mappings.csv"')
    response.send(request.body.mappings);
});

module.exports = api;