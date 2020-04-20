var db = require('../corma-transaction-processor/db.js');

exports.getMemberList = function (done) {
    db.get().query("select m.id, m.name, m.informal_name as nickname, DATE_FORMAT(m.joining_date, '%Y-%m-%d') as joiningDate, cp.amount/cp.frequency as contributionAmount, m.email from members m, contribution_plan cp where m.id = cp.id and cp.deactivation_date is NULL", function (err, rows) {
        if (err) return done(err);
        done(null, rows)
    });
};
