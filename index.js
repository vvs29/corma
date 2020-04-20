var express = require('express');
var app = express();

app.use(function(req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    next();

});

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.use('/user',require('./routes/members.js'));

app.use(express.json());
app.use('/api',require('./routes/api.js'));

var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
   
    console.log("CorMa listening at http://%s:%s", host, port)
});
