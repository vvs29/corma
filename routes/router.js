const express = require('express'),
    router = express.Router();

app.get('/', function (req, res) {
    res.send('Hello World');
})

//making use of normal routes
router.get('/john',(request,response)=>{
    response.send('Home of user');
});

router.get('/mark',(request,response)=>{
    response.send('Home of user');
});

//exporting thee router to other modules
module.exports = router;