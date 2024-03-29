var db = require('../corma-transaction-processor/db');
var membersModel = require('../models/members');

const express = require('express'),
    members = express.Router();

var connectDB = () => {
    var conn = db.get();
    console.log("DEBUG::No connection. Connecting");
    if (conn === null || conn === undefined) {
        db.connect(db.MODE_DEVELOPMENT, function (err) {
            if (err) {
                console.log('ERROR::Unable to connect to MySQL.');
                process.exit(1);
            } else {
                console.log('DEBUG::Connected to MySQL.');
            }
        });
    }
}

members.get('/',(request, response)=>{
    connectDB();
    membersModel.getMemberList(function (err, memberList) {
        let memberListJSON = {};
        for (var i in memberList) {
            let memberInfo = {};
            memberInfo.mid = memberList[i].id;
            memberInfo.fullname = memberList[i].name;
            memberInfo.nickname = memberList[i].nickname;
            memberInfo.joiningDate = memberList[i].joiningDate;
            memberInfo.contributionAmount = memberList[i].contributionAmount;
            memberInfo.email = memberList[i].email;

            memberListJSON[memberList[i].id] = memberInfo;
        }
        response.header("Access-Control-Allow-Origin", "*");
        response.json(memberListJSON);
    });
});

members.get('/mark',(request, response)=>{
    response.send('Home of mark');
});

//exporting thee members to other modules
module.exports = members;