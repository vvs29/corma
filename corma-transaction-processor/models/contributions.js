var db = require('../db.js');
var moment = require('moment');

exports.getForPlanID = function (planID, done) {
    db.get().query("SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as contribution_date FROM contributions where plan_id=" + planID + " order by date DESC limit 1", function (err, rows) {
        if (err) return done(err);
        done(null, rows);
    });
};

// Fix 10: Add transaction support
exports.updateContributions = function (contributionEntries, connection, callback) {
    var nEntries = 0;
    var values = [];
    var placeholders = [];
    
    // Fix 3: Add proper error handling
    try {
        for (var planID in contributionEntries) {
            nEntries++;
            var contributionDates = contributionEntries[planID];
            contributionDates.forEach(function (date) {
                values.push(planID, date);
                placeholders.push("(?, ?)");
            });
        }
        
        if (nEntries < 1) {
            if (callback) callback(null);
            return;
        }
        
        // If no connection is provided, use the default pool
        const dbConnection = connection || db.get();
        
        var query = "INSERT INTO contributions (plan_id, date) VALUES " + placeholders.join(",");
        dbConnection.query(query, values, function (err, result) {
            if (err) {
                if (callback) callback(err);
                return;
            }
            
            if (callback) callback(null);
        });
    } catch (err) {
        if (callback) callback(err);
    }
};

var getCutoffDate = function() {
    var startYear = '2019'; // Change this when the FY changes. Eg: if FY is 2018-19, then set this to 2018
    return startYear + "-04-01";
};

exports.getContributionReport = function (done) {
    var cutoffDate = getCutoffDate();
    // var reportEndDate = moment(new Date(cutoffDate)).add(1, )
    db.get().query("SELECT * from contributionReport where date >= '" + cutoffDate + "'", function (err, rows) {
        if (err) return done(err);
        done(null, rows);
    });
};

exports.getBalanceMonths = function (done) {
    var cutoffDate = moment(new Date()).format('YYYY-MM-DD');
    db.get().query("SELECT p.member_id as memberID, TIMESTAMPDIFF(MONTH, p.activation_date, '" + cutoffDate + "') - count(c.date) + 1 as balanceMonths from contributionReport c right outer join contribution_plan p on c.id = p.member_id where (c.date is null or (c.date <= '" + cutoffDate + "' and c.date >= p.activation_date)) and '" + cutoffDate + "' > p.activation_date and (p.deactivation_date IS NULL or '" + cutoffDate + "' < deactivation_date) group by memberID", function (err, rows) {
        if (err) return done(err);
        done(null, rows);
    });
};
