var db = require('./db');
var deposits = require('./models/deposits');
var contributions = require('./models/contributions');
var moment = require('moment');
var fs = require('fs');

var cutoffDate = '2019-04-01'; // Change this when the FY changes. Eg: if FY is 2018-19, then set this to 2018-04-01

db.connect(db.MODE_DEVELOPMENT, function (err) {
    if (err) {
        console.log('ERROR::Unable to connect to MySQL.');
        process.exit(1);
    } else {
        console.log('DEBUG::Connected to MySQL.');
    }
});

var getValue = function (month, contributionReport, depositReport, balanceMonths, monthOffset) {
    if (depositReport !== null && depositReport !== undefined && depositReport[month] !== null && depositReport[month] !== undefined) {
        return depositReport[month];
    }
    if (contributionReport !== null && contributionReport !== undefined && contributionReport[month] !== null && contributionReport[month] !== undefined) {
        return '0';
    }

    var today = moment(new Date());
    var dateToProcess = moment(new Date(cutoffDate)).add(monthOffset, 'months');
    if (today.diff(dateToProcess, 'days') < 0) {
        return '';
    }
    var diffMonths = today.diff(dateToProcess, 'months');
    if (balanceMonths !== null && balanceMonths !== undefined && diffMonths >= 0) {
        return 'p' + (balanceMonths - diffMonths);
    }
    return '';
};

contributions.getContributionReport(function (err, report) {
    var contributionReport = {};
    for (var i = 0; i < report.length; i++) {
        if (contributionReport[report[i].id] === undefined) {
            contributionReport[report[i].id] = {};
        }
        contributionReport[report[i].id][moment(new Date(report[i].date)).format("M")] = report[i].plannedAmount;
    }
    console.log("Contribution Status:" + JSON.stringify(contributionReport));


    deposits.getDepositsReport(function (err, depositReportRaw) {
        var depositReport = {};
        for (var i = 0; i < depositReportRaw.length; i++) {
            let memberId = depositReportRaw[i].member_id;
            if (depositReport[memberId] === undefined) {
                depositReport[memberId] = {};
            }
            let currMonth = moment(new Date(depositReportRaw[i].date)).format("M");
            var amount = depositReport[memberId][currMonth];
            if (amount === undefined) {
                depositReport[memberId][currMonth] = depositReportRaw[i].amount;
            } else {
                depositReport[memberId][currMonth] = amount + depositReportRaw[i].amount;
            }
        }
        console.log("Deposit Status:" + JSON.stringify(depositReport));

        contributions.getBalanceMonths(function (err, balanceMonthsRaw) {
            var balanceMonths = {};
            for (var i = 0; i < balanceMonthsRaw.length; i++) {
                balanceMonths[balanceMonthsRaw[i].memberID] = balanceMonthsRaw[i].balanceMonths;
            }
            console.log("balance Status:" + JSON.stringify(balanceMonths));


            var fd = fs.openSync('contributionReport_' + moment().format('YYYYMMDDHHmmss'), 'w');
            fs.writeSync(fd, 'memberID,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,Jan,Feb,Mar\n');

            for (var memberID in contributionReport) {
                var line = '' + memberID;
                if (!contributionReport.hasOwnProperty(memberID)) {
                    continue;
                }
                line += ',' + getValue('4', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 0);
                line += ',' + getValue('5', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 1);
                line += ',' + getValue('6', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 2);
                line += ',' + getValue('7', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 3);
                line += ',' + getValue('8', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 4);
                line += ',' + getValue('9', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 5);
                line += ',' + getValue('10', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 6);
                line += ',' + getValue('11', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 7);
                line += ',' + getValue('12', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 8);
                line += ',' + getValue('1', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 9);
                line += ',' + getValue('2', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 10);
                line += ',' + getValue('3', contributionReport[memberID], depositReport[memberID], balanceMonths[memberID], 11);
                fs.writeSync(fd, line + '\n');
            }

            fs.closeSync(fd);
        });
    });
});