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

// API endpoint to get unidentified deposits (missing member_id)
api.get('/unidentified-deposits', (request, response) => {
    // Connect to the database
    if (!connectDB()) {
        return response.status(500).json({ 
            success: false, 
            message: 'Failed to connect to the database' 
        });
    }
    
    // Use the deposits model to get unidentified records
    depositsModel.getUnidentifiedDeposits(function(err, deposits) {
        if (err) {
            console.error('Error fetching unidentified deposits:', err);
            return response.status(500).json({ 
                success: false, 
                message: 'Error fetching unidentified deposits', 
                error: err.message 
            });
        }
        
        // Format the data to match the expected structure for the frontend
        const formattedData = {};
        
        deposits.forEach(deposit => {
            // Format the date as dd-MM-YYYY
            let formattedDate = deposit.date;
            if (deposit.date instanceof Date) {
                const day = String(deposit.date.getDate()).padStart(2, '0');
                const month = String(deposit.date.getMonth() + 1).padStart(2, '0');
                const year = deposit.date.getFullYear();
                formattedDate = `${day}-${month}-${year}`;
            } else if (typeof deposit.date === 'string') {
                // If it's already a string, try to parse and reformat
                try {
                    const dateObj = new Date(deposit.date);
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    formattedDate = `${day}-${month}-${year}`;
                } catch (e) {
                    console.error('Error formatting date:', e);
                    // Keep the original date if parsing fails
                }
            }
            
            // Create a unique key for each deposit including formatted date and amount
            const key = `${deposit.description} - ${formattedDate} - Rs. ${deposit.amount} (${deposit.bank_trans_id})`;
            
            // Format the data similar to what the suggestions API would return
            formattedData[key] = {
                transactionAmount: deposit.amount,
                transactionDescription: deposit.description,
                transactionDate: deposit.date,
                transactionId: deposit.bank_trans_id,
                mid: null // This is null since these are unidentified
            };
        });
        
        // Return success response
        response.json(formattedData);
    });
});

module.exports = api;
