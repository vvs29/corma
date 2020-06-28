const express = require('express'),
    api = express.Router();
var fs = require('fs');
const {execSync} = require('child_process');
const { v4: uuidv4 } = require('uuid');

api.post('/process_transactions', (request, response) => {
    response.header('Content-Type', 'text/csv');
    response.header('Content-Disposition', 'attachment; filename="mappings.csv"')
    response.send(request.body.mappings);
});

api.post('/suggestions', (request, response) => {
    let inputCSV = request.body.csv;

    let workDir = "/tmp/cormaService/" + uuidv4();
    let createWorkDirOut = execSync('mkdir -p ' + workDir);


    let command = "java -jar corma-transaction-identifier/build/artifacts/corma_transaction_identifier_jar/corma-transaction-identifier.jar";

    let inputCSVFile = workDir + "/input.csv";

    let tmpout = execSync('echo ' + JSON.stringify(inputCSV) + ' > ' + inputCSVFile);
    let identificationMapFile = "corma-transaction-identifier/res/identificationMap.csv";
    let params = "dd-MM-yyyy " + workDir + "/contrib_output.csv" + workDir + "/spent_output.csv";
    let outputJsonFile = workDir + "/contrib_output.json";

    let identifierOut = execSync(command + " " + inputCSVFile + " " + identificationMapFile + " " + params + " " + outputJsonFile);

    var suggestionsJSON = JSON.parse(fs.readFileSync(outputJsonFile, 'utf8'));
    let deleteWorkDir = execSync('rm -r ' + workDir);
    response.json(suggestionsJSON);
});

module.exports = api;