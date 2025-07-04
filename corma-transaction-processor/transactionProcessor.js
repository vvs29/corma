var db = require('./db');
var deposits = require('./models/deposits');
var contributions = require('./models/contributions');
var moment = require('moment');
// Fix 2: Remove async module, we'll use native async/await instead
// var async = require('async');

// Promisify the database connection
function connectToDatabase() {
    return new Promise((resolve, reject) => {
        db.connect(db.MODE_DEVELOPMENT, function(err) {
            if (err) {
                console.log('ERROR::Unable to connect to MySQL.');
                reject(err);
            } else {
                console.log('DEBUG::Connected to MySQL.');
                resolve();
            }
        });
    });
}

// Promisify the deposits.getUnprocessed function
function getUnprocessedDeposits() {
    return new Promise((resolve, reject) => {
        deposits.getUnprocessed(function(err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Promisify the deposits.getPlanForMember function
function getPlanForMember(memberID) {
    return new Promise((resolve, reject) => {
        deposits.getPlanForMember(memberID, function(err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Promisify the contributions.getForPlanID function
function getContributionsForPlanID(planID) {
    return new Promise((resolve, reject) => {
        contributions.getForPlanID(planID, function(err, rows) {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Promisify the deposits.updateStatus function
function updateDepositStatus(depositStatus, connection) {
    return new Promise((resolve, reject) => {
        deposits.updateStatus(depositStatus, connection, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Promisify the contributions.updateContributions function
function updateContributions(contributionEntries, connection) {
    return new Promise((resolve, reject) => {
        contributions.updateContributions(contributionEntries, connection, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// Promisify transaction functions
function beginTransaction() {
    return new Promise((resolve, reject) => {
        db.beginTransaction(function(err, connection) {
            if (err) {
                reject(err);
            } else {
                resolve(connection);
            }
        });
    });
}

function commitTransaction(connection) {
    return new Promise((resolve, reject) => {
        db.commit(connection, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function rollbackTransaction(connection) {
    return new Promise((resolve, reject) => {
        db.rollback(connection, function() {
            resolve();
        });
    });
}

// Initialize the database connection
connectToDatabase().catch(err => {
    process.exit(1);
});

// Fix 2: Use async/await for better handling of asynchronous operations
function compareDeposits(a, b) {
    // Fix 9: Consistent date handling using moment
    var aDate = moment(a.deposit_date);
    var bDate = moment(b.deposit_date);

    if (aDate.isBefore(bDate)) {
        return -1;
    }

    if (aDate.isAfter(bDate)) {
        return 1;
    }

    return 0;
}

// Process deposits for a single member
async function processMemberDeposits(memberID, memberDeposits) {
    try {
        // Get the member's contribution plan
        const planRows = await getPlanForMember(memberID);
        
        if (planRows.length !== 1) {
            console.log("ERROR::There should be exactly 1 active contribution plan for member " + memberID + ". Found: " + planRows.length);
            return;
        }
        
        const plan = planRows[0];
        const planID = plan.id;
        
        // Fix 9: Consistent date handling using moment
        let lastContributedDate = moment(plan.activation_date).subtract(1, 'months').toDate();
        
        // Get the last contribution date
        const contributionData = await getContributionsForPlanID(planID);
        if (contributionData.length > 0) {
            // Fix 9: Consistent date handling using moment
            lastContributedDate = moment(contributionData[0].contribution_date).toDate();
        }
        
        // Sort deposits by date
        memberDeposits.sort(compareDeposits);
        
        // Process the deposits
        const depositStatus = {};
        const contributionEntries = {};
        let unprocessedAmount = 0;
        let nTotalMonths = 0;
        const contributionsDates = [];
        
        // Calculate how many months can be covered by the deposits
        for (let i = 0; i < memberDeposits.length; i++) {
            const depositAmount = memberDeposits[i].unprocessedAmount;
            const plannedAmount = plan.monthlyContribution;
            unprocessedAmount += depositAmount;
            
            if (unprocessedAmount < plannedAmount) {
                continue;
            }
            
            const nMonthsForDeposit = Math.floor(unprocessedAmount/plannedAmount);
            nTotalMonths += nMonthsForDeposit;
            unprocessedAmount -= (nMonthsForDeposit * plannedAmount);
            
            for (let doneDepositIndex = 0; doneDepositIndex < i; doneDepositIndex++) {
                depositStatus[memberDeposits[doneDepositIndex].id] = memberDeposits[doneDepositIndex].processed_amount + memberDeposits[doneDepositIndex].unprocessedAmount;
            }
            
            depositStatus[memberDeposits[i].id] = depositAmount - unprocessedAmount;
        }
        
        // Generate contribution dates
        for (let monthOffset = 0; monthOffset < nTotalMonths; monthOffset++) {
            // Fix 9: Consistent date handling using moment
            const contributionDate = moment(lastContributedDate).add(monthOffset + 1, 'months').format('YYYY-MM-DD');
            if (monthOffset === 0) {
                contributionsDates[0] = contributionDate;
            } else {
                contributionsDates.push(contributionDate);
            }
        }
        
        if (contributionsDates.length > 0) {
            contributionEntries[planID] = contributionsDates;
        }
        
        // Fix 10: Use transactions to ensure data consistency
        let connection = null;
        try {
            // Begin a transaction
            connection = await beginTransaction();
            
            // Update deposit status within the transaction
            await updateDepositStatus(depositStatus, connection);
            // Fix 6: Improve logging with proper prefixes and formatting
            console.log("INFO::Deposit Status: " + JSON.stringify(depositStatus));
            
            // Update contributions within the transaction
            await updateContributions(contributionEntries, connection);
            // Fix 6: Improve logging with proper prefixes and formatting
            console.log("INFO::Contribution entries: " + JSON.stringify(contributionEntries));
            
            // Commit the transaction
            await commitTransaction(connection);
            console.log("INFO::Transaction committed successfully for member " + memberID);
        } catch (error) {
            // Rollback the transaction on error
            if (connection) {
                await rollbackTransaction(connection);
            }
            console.log("ERROR::Failed to update database: " + error);
        }
    } catch (error) {
        console.log("ERROR::Failed to process deposits for member " + memberID + ": " + error);
    }
}

// Main function to process all transactions
async function processTransactions() {
    try {
        // Get all unprocessed deposits
        const rows = await getUnprocessedDeposits();
        
        // Group deposits by member ID
        const memberDepositInfo = new Map();
        for (let i = 0; i < rows.length; i++) {
            const entry = rows[i];
            const memDeposits = memberDepositInfo.get(entry.member_id);
            if (memDeposits) {
                memDeposits.push(entry);
            } else {
                memberDepositInfo.set(entry.member_id, [entry]);
            }
        }
        
        // Process each member's deposits
        for (const [memberID, deposits] of memberDepositInfo.entries()) {
            await processMemberDeposits(memberID, deposits);
        }
        
        console.log("INFO::Transaction processing completed successfully.");
    } catch (error) {
        console.log("ERROR::Failed to process transactions: " + error);
        process.exit(1);
    }
}

// Start processing
connectToDatabase()
    .then(() => processTransactions())
    .catch(err => {
        console.log("ERROR::Failed to connect to database: " + err);
        process.exit(1);
    });
