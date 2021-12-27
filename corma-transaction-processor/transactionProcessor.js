var db = require('./db');
var deposits = require('./models/deposits');
var contributions = require('./models/contributions');
var moment = require('moment');

db.connect(db.MODE_DEVELOPMENT, function(err) {
    if (err) {
        console.log('ERROR::Unable to connect to MySQL.');
        process.exit(1);
    } else {
        console.log('DEBUG::Connected to MySQL.');
    }
});

function compareDeposits(a, b) {
    var aDate = new Date(a.deposit_date);
    var bDate = new Date(b.deposit_date);

    if (aDate < bDate) {
        return -1;
    }

    if (aDate > bDate) {
        return 1;
    }

    return 0;
}

var memberDepositInfo = new Map();
deposits.getUnprocessed(function(err, rows) {
    if (err) {
        console.log("ERROR::" + err);
        process.exit(1);
    }

    for (var i = 0; i < rows.length; i++) {
        var entry = rows[i];
        var memDeposits = memberDepositInfo.get(entry.member_id);
        if (memDeposits) {
            memDeposits.push(entry);
        } else {
            memDeposits = [entry];
            memberDepositInfo.set(entry.member_id, memDeposits);
        }
    }

    //var contributedIDs = memberDepositInfo.keys();
    var contributionPlans = new Map();
    memberDepositInfo.forEach(function (deposit, memberID) {
        deposits.getPlanForMember(memberID, function (err, rows) {
            if (err) {
                console.log("ERROR::" + err);
                process.exit(1);
            }

            if (rows.length != 1) {
                console.log("ERROR::There should be exactly 1 active contribution plan for a member. Found:" + rows.length);
            }

            var planID = rows[0].id;
            var lastContributedDate = moment(new Date(rows[0].activation_date)).add(-1, 'months').toDate();
            // WARNING: assuming the deposits are for single plan id. Should deposit for new plan ID
            // only after old deposit is processed and new plan id is activated
            contributions.getForPlanID(planID, function (err, contributionData) {
                if (contributionData.length > 0) {
                    lastContributedDate = new Date(contributionData[0].contribution_date);
                }
                var memberDeposits = memberDepositInfo.get(memberID);
                memberDeposits.sort(compareDeposits);

                var depositStatus = {};
                var contributionEntries = {};
                var unprocessedAmount = 0;
                var nTotalMonths = 0;
                for (var i = 0; i < memberDeposits.length; i++) {
                    var depositAmount = memberDeposits[i].unprocessedAmount;
                    var plannedAmount = rows[0].monthlyContribution;
                    unprocessedAmount += depositAmount;
                    if (unprocessedAmount < plannedAmount) {
                        continue;
                    }
                    var nMonthsForDeposit = Math.floor(unprocessedAmount/plannedAmount);
                    nTotalMonths += nMonthsForDeposit;
                    unprocessedAmount -= (nMonthsForDeposit * plannedAmount);
                    for (var doneDepositIndex = 0; doneDepositIndex < i; doneDepositIndex++) {
                        depositStatus[memberDeposits[doneDepositIndex].id] = memberDeposits[doneDepositIndex].processed_amount + memberDeposits[doneDepositIndex].unprocessedAmount;
                    }
                    depositStatus[memberDeposits[i].id] = depositAmount - unprocessedAmount;
                    var contributionsDates;
                }
                for (var monthOffset = 0; monthOffset < nTotalMonths; monthOffset++) {
                    var contributionDate = moment(lastContributedDate).add(monthOffset + 1, 'months').format('YYYY-MM-DD');
                    if (monthOffset == 0) {
                        contributionsDates = [contributionDate];
                    } else {
                        contributionsDates.push(contributionDate);
                    }
                    contributionEntries[planID] = contributionsDates;
                }
                deposits.updateStatus(depositStatus);
                console.log("Deposit Status:" + JSON.stringify(depositStatus));
                contributions.updateContributions(contributionEntries);
                console.log("Contribution entries:" + JSON.stringify(contributionEntries));
            });
        });
    });
    console.log("vijay3");
});

