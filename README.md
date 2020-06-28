For mapping transactions to member IDs

Command line Args:
<bankStatementCSVPath> res/identificationMap.csv dd-MM-yyyy <deposits_CSV> <withdrawal_CSV> <deposits_JSON>
Eg: java -jar build/artifacts/corma_transaction_identifier_jar/corma-transaction-identifier.jar /tmp/imgl-txns.csv res/identificationMap.csv dd-MM-yyyy /tmp/deposits_out.csv /tmp/spent_out.csv /tmp/deposits_out.json