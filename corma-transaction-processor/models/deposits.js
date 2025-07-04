var db = require('../db.js');
var moment = require('moment');

exports.getUnprocessed = function (done) {
    db.get().query("SELECT id, member_id, (amount - processed_amount) as unprocessedAmount, DATE_FORMAT(date, '%Y-%m-%d') as deposit_date, processed_amount FROM deposits where type = 'REG' and (amount - processed_amount) > 0.0001 and member_id is not NULL and member_id != 0", function (err, rows) {
        if (err) return done(err);
        done(null, rows)
    });
};

exports.getPlanForMember = function (memberID, done) {
    db.get().query("SELECT id, (amount / frequency) as monthlyContribution, activation_date FROM contribution_plan where (deactivation_date is NULL or activation_date > deactivation_date) and member_id=" + memberID, function (err, rows) {
        if (err) return done(err);
        done(null, rows)
    });
};

// Fix 10: Add transaction support
exports.updateStatus = function (depositStatus, connection, callback) {
    var today = moment(new Date()).format('YYYY-MM-DD');
    var queries = [];
    var queryParams = [];
    
    // Fix 3: Add proper error handling
    try {
        for (var depositID in depositStatus) {
            var processedAmount = depositStatus[depositID];
            var query = "UPDATE deposits SET processed_amount = ?, last_processed = ? WHERE id = ?";
            queries.push(query);
            queryParams.push([processedAmount, today, depositID]);
        }
        
        // If no connection is provided, use the default pool
        const dbConnection = connection || db.get();
        
        // Execute all queries
        var completed = 0;
        var hasError = false;
        
        if (queries.length === 0) {
            if (callback) callback(null);
            return;
        }
        
        for (var i = 0; i < queries.length; i++) {
            dbConnection.query(queries[i], queryParams[i], function(err, result) {
                if (hasError) return;
                
                if (err) {
                    hasError = true;
                    if (callback) callback(err);
                    return;
                }
                
                completed++;
                if (completed === queries.length && callback) {
                    callback(null);
                }
            });
        }
    } catch (err) {
        if (callback) callback(err);
    }
};

exports.getDepositsReport = function (done) {
    var today = moment(new Date()).format('YYYY-MM-DD');
    db.get().query("SELECT id, member_id, amount, date from deposits where date >= '2019-04-01' and date <= '" + today + "' and member_id IS NOT NULL", function (err, rows) {
        if (err) return done(err);
        done(null, rows);
    });
};
