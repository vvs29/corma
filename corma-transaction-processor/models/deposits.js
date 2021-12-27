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

exports.updateStatus = function (depositStatus) {
    var values = '';
    var today = moment(new Date()).format('YYYY-MM-DD');
    for (var depositID in depositStatus) {
        var processedAmount = depositStatus[depositID];
        var query = "update deposits set processed_amount = " + processedAmount + ", last_processed = '" + today + "' where id = " + depositID + ";";
        db.get().query(query, function (err, rows) {
            if (err) return console.log("ERROR::Failed to write to contributions table. Error was:" + err + " and query was:" + query);
        });
    }
};

exports.getDepositsReport = function (done) {
    var today = moment(new Date()).format('YYYY-MM-DD');
    db.get().query("SELECT id, member_id, amount, date from deposits where date >= '2019-04-01' and date <= '" + today + "' and member_id IS NOT NULL", function (err, rows) {
        if (err) return done(err);
        done(null, rows);
    });
};
