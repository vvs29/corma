const express = require('express'),
    router = express.Router();

router.get('/',(request,response)=>{
    response.send('Home of user');
});

router.get('/mark',(request,response)=>{
    response.send('Home of mark');
});

//exporting thee router to other modules
module.exports = router;