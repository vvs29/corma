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

// Fix 10: Add transaction support functions
exports.beginTransaction = function(callback) {
    state.pool.getConnection(function(err, connection) {
        if (err) {
            return callback(err);
        }
        
        connection.beginTransaction(function(err) {
            if (err) {
                connection.release();
                return callback(err);
            }
            
            callback(null, connection);
        });
    });
};

exports.commit = function(connection, callback) {
    connection.commit(function(err) {
        if (err) {
            connection.rollback(function() {
                connection.release();
                return callback(err);
            });
        }
        
        connection.release();
        callback();
    });
};

exports.rollback = function(connection, callback) {
    connection.rollback(function() {
        connection.release();
        callback();
    });
};
