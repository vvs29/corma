var db = require('../corma-transaction-processor/db.js');

// Function to get deposits with missing member_id
exports.getUnidentifiedDeposits = function (done) {
    // Get database connection pool
    const pool = db.get();
    
    // Get a connection from the pool
    pool.getConnection(function(err, connection) {
        if (err) {
            console.error('Error getting connection from pool:', err);
            return done(err);
        }
        
        // Query to get records with null member_id
        const query = `SELECT * FROM deposits WHERE member_id IS NULL ORDER BY date DESC`;
        
        // Execute the query
        connection.query(query, function(err, results) {
            // Release the connection back to the pool
            connection.release();
            
            if (err) {
                console.error('Error fetching unidentified deposits:', err);
                return done(err);
            }
            
            // Return the results
            done(null, results);
        });
    });
};

// Function to update deposits with transaction details
exports.updateDeposits = function (transactions, done) {
    // Get database connection pool
    const pool = db.get();
    
    // Get a connection from the pool
    pool.getConnection(function(err, connection) {
        if (err) {
            console.error('Error getting connection from pool:', err);
            return done(err);
        }
        
        // Start a transaction
        connection.beginTransaction(function(err) {
            if (err) {
                console.error('Error starting transaction:', err);
                connection.release();
                return done(err);
            }

            // Process each transaction sequentially to maintain transaction integrity
            let processedCount = 0;
            
            // Function to process a single transaction
            const processTransaction = function(index) {
                if (index >= transactions.length) {
                    // All transactions processed, commit the transaction
                    connection.commit(function(err) {
                        if (err) {
                            console.error('Error committing transaction:', err);
                            return connection.rollback(function() {
                                connection.release();
                                done(err);
                            });
                        }
                        
                        // Return success
                        connection.release();
                        done(null, processedCount);
                    });
                    return;
                }
                
                const transaction = transactions[index];
                
                // Prepare the SQL query
                const query = `
                    INSERT INTO deposits 
                    (member_id, amount, description, date, type, bank_trans_id) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    member_id = VALUES(member_id),
                    amount = VALUES(amount),
                    description = VALUES(description),
                    date = VALUES(date),
                    type = VALUES(type)
                `;

                // Execute the query
                connection.query(
                    query, 
                    [
                        transaction.member_id, 
                        transaction.amount, 
                        transaction.description, 
                        transaction.date, 
                        transaction.type, 
                        transaction.bank_trans_id
                    ],
                    function(err, result) {
                        if (err) {
                            console.error('Error inserting/updating deposit:', err);
                            return connection.rollback(function() {
                                connection.release();
                                done(err);
                            });
                        }
                        
                        processedCount++;
                        // Process the next transaction
                        processTransaction(index + 1);
                    }
                );
            };
            
            // Start processing transactions
            processTransaction(0);
        });
    });
};
