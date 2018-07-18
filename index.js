var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.send('Hello World');
});

app.use('/user',require('./routes/router.js'));

var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
   
    console.log("CorMa listening at http://%s:%s", host, port)
});
