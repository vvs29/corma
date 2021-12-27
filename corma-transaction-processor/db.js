var mysql = require('mysql');
//    , async = require('async');

var PRODUCTION_DB = 'corma'
    , TEST_DB = 'corma_test'
    , DEVELOPMENT_DB = 'corma_dev';

exports.MODE_TEST = 'mode_test';
exports.MODE_DEVELOPMENT = 'mode_dev';
exports.MODE_PRODUCTION = 'mode_production';

var state = {
    pool: null,
    mode: null,
};

exports.connect = function(mode, done) {
    var dbInstance;
    switch (mode) {
        case exports.MODE_PRODUCTION:
            dbInstance = PRODUCTION_DB;
            break;
        case exports.MODE_TEST:
            dbInstance = TEST_DB;
            break;
        default:
            dbInstance = DEVELOPMENT_DB;
            break;
    }

    state.pool = mysql.createPool({
        host: '',
        user: '',
        password: '',
        database: dbInstance
    });

    state.mode = mode;
    done();
};

exports.get = function() {
    return state.pool;
};
