const express = require('express'),
    api = express.Router();
var fs = require('fs');
const {execSync} = require('child_process');
const { v4: uuidv4 } = require('uuid');
var db = require('../corma-transaction-processor/db');
var depositsModel = require('../models/deposits');

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

    let tmpout = execSync('echo "' + inputCSV + '" > ' + inputCSVFile);
    let identificationMapFile = "corma-transaction-identifier/res/identificationMap.csv";
    let params = workDir + "/contrib_output.csv " + workDir + "/spent_output.csv";
    let outputJsonFile = workDir + "/contrib_output.json";

    const builtCmd = command + " " + inputCSVFile + " " + identificationMapFile + " " + params + " " + outputJsonFile;
    let identifierOut = execSync(builtCmd);

    var suggestionsJSON = JSON.parse(fs.readFileSync(outputJsonFile, 'utf8'));
    let deleteWorkDir = execSync('rm -r ' + workDir);
    response.json(suggestionsJSON);
});

// Connect to the database if not already connected
var connectDB = () => {
    var conn = db.get();
    console.log("DEBUG::Checking database connection");
    if (conn === null || conn === undefined) {
        db.connect(db.MODE_DEVELOPMENT, function (err) {
            if (err) {
                console.log('ERROR::Unable to connect to MySQL.');
                return false;
            } else {
                console.log('DEBUG::Connected to MySQL.');
                return true;
            }
        });
    }
    return true;
};

// API endpoint to update the deposits table with transaction details
api.post('/update-deposits', (request, response) => {
    // Connect to the database
    if (!connectDB()) {
        return response.status(500).json({ 
            success: false, 
            message: 'Failed to connect to the database' 
        });
    }

    const { transactions } = request.body;
    
    if (!transactions || !Array.isArray(transactions)) {
        return response.status(400).json({ 
            success: false, 
            message: 'Invalid request format. Expected an array of transactions.' 
        });
    }

    // Use the deposits model to update the database
    depositsModel.updateDeposits(transactions, function(err, count) {
        if (err) {
            console.error('Error updating deposits:', err);
            return response.status(500).json({ 
                success: false, 
                message: 'Error processing transactions', 
                error: err.message 
            });
        }
        
        // Return success response
        response.json({ 
            success: true, 
            message: `Successfully processed ${count} transactions` 
        });
    });
});

module.exports = api;
