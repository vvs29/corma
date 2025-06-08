package com.tnineworks.imaigal;

/**
 * TransactionParser - Parses transaction data from CSV files
 * 
 * This version includes the following enhancements:
 * 1. Updated to use Float instead of Integer for transaction amounts for more precision
 * 2. Updated NEFT parsing index from 34 to 44 for 2025 format changes
 * 3. Added support for INFT and ONL payment types
 * 4. Added debug logging capability (enable with "debug" as first argument)
 * 5. Added support for REV IMPS transaction type
 * 6. Added N N SRIPRIYA,N name replacement
 * 7. Improved error handling for transaction description parsing
 * 8. Auto-detection of date formats (d/M/yy or dd-MM-yyyy) without requiring format parameter
 * 9. Added Transaction POJO for better encapsulation
 */

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;


public class TransactionParser {

    public static String m_transactions = null;

    // Map has transaction remarks as key and Name identification as value
    private static HashMap<String, String[]> identificationMap = new HashMap<String, String[]>();
    private static Set<Transaction> transactions = new HashSet<Transaction>();
    private static TreeMap<String, String> spentAmountMap = new TreeMap<String, String>();
    private static Set<String> transNameSet = new HashSet<String>();
    private static JsonObject outputJson = null;
    public static final String UTF8_BOM = "\uFEFF";
    private static boolean isDebug = false;

    public static void main(String[] args) throws IOException
    {
        if (args.length > 0 && args[0].equals("debug")) {
            System.out.println("Debug - Enabled");
            isDebug = true;
            // Shift arguments if debug mode is enabled
            String[] newArgs = new String[args.length - 1];
            System.arraycopy(args, 1, newArgs, 0, args.length - 1);
            args = newArgs;
        }
        
        outputJson = new JsonObject();
        m_transactions = args[0];
        populateIdentificationMap(args[1]);
        debugLog("Populated Identification Map: " + identificationMap);
        transNameSet = identificationMap.keySet();
        parseTxns();
        printMap(args[2], args[3]);
        writeMapAsJson(args[4]);
    }
    
    /**
     * Logs debug messages if debug mode is enabled
     */
    private static void debugLog(String message) {
        if (isDebug) {
            System.out.println("[DEBUG] " + message);
        }
    }

    /**
     * Populates the identification map from the input file
     * Supports semicolon-delimited identifiers for the same person
     * Format: DisplayName,MemberID,Identifier1;Identifier2;Identifier3
     */
    private static void populateIdentificationMap(String input) throws IOException {
        BufferedReader br = new BufferedReader(new FileReader(input));
        String line;

        while ((line = br.readLine()) != null) {
            debugLog("ID Map line: " + line);
            StringTokenizer st = new StringTokenizer(line, ",");
            
            // First token is the display name
            String displayName = st.nextToken().trim();
            
            // Second token is the member ID
            String memberID = st.hasMoreTokens() ? st.nextToken().trim() : "";
            
            // Third token may contain multiple identification texts separated by semicolons
            if (st.hasMoreTokens()) {
                String identifiers = st.nextToken().trim();
                StringTokenizer idTokenizer = new StringTokenizer(identifiers, ";");
                
                // Process each identifier
                while (idTokenizer.hasMoreTokens()) {
                    String identifier = idTokenizer.nextToken().trim().replaceAll(" +", " ");
                    debugLog("Adding identifier: " + identifier + " for " + displayName + " (" + memberID + ")");
                    identificationMap.put(identifier.toLowerCase(), new String[] {displayName, memberID});
                }
            } else {
                // Backward compatibility: if no identifiers specified, use display name as identifier
                debugLog("No identifiers specified, using display name as identifier: " + displayName);
                identificationMap.put(displayName.toLowerCase(), new String[] {displayName, memberID});
            }
        }
        br.close();
    }

    private static void printMap(String contributionOutput, String spentOutput) throws IOException {
        BufferedWriter contributionWriter = null;
        BufferedWriter spentWriter = null;
        try {
            contributionWriter = new BufferedWriter(new FileWriter(contributionOutput));
            String header = "name,member_id,description,date,bank_trans_id,amount";
            System.out.println(header);
            contributionWriter.write(header+"\n");
            
            debugLog("Writing " + transactions.size() + " contribution entries to " + contributionOutput);
            for (Transaction transaction : transactions) {
                String displayName = transaction.getDisplayName() != null ? transaction.getDisplayName() : "";
                String mid = transaction.getMid() != null ? transaction.getMid() : "";
                String description = transaction.getTransactionDescription();
                String date = transaction.getTransactionDate();
                String id = transaction.getTransactionId();
                Float amount = transaction.getTransactionAmount();
                
                String consoleData = displayName + "," + mid + "," + description + "," + date + "," + id + "," + amount;
                debugLog("Writing contribution: " + consoleData);
                contributionWriter.write(consoleData + "\n");
            }

            // now write spent details
            spentWriter = new BufferedWriter(new FileWriter(spentOutput));
            header = "transName,amount";
            spentWriter.write(header+"\n");
            
            debugLog("Writing " + spentAmountMap.size() + " spent entries to " + spentOutput);
            Set<String> transNames = spentAmountMap.keySet();
            for (String transName : transNames) {
                debugLog("Writing spent: " + transName + "," + spentAmountMap.get(transName));
                spentWriter.write(transName + "," + spentAmountMap.get(transName) + '\n');
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (contributionWriter != null) {
                contributionWriter.close();
            }
            if (spentWriter != null) {
                spentWriter.close();
            }
        }
    }

    // 0 based index
    static int COL_BANK_TRANS_ID = 0;
    static int COL_VALUE_DATE = 1;
    static int COL_DESC = 4;
    static int COL_TYPE = COL_DESC + 1;
    static int COL_AMOUNT = COL_TYPE + 1;

    /**
     * Parse transactions from the CSV file
     * Auto-detects date format (d/M/yy or dd-MM-yyyy)
     */
    private static void parseTxns() throws IOException
    {
        BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(m_transactions)));
        String line = null;

        int totalAmount = 0;
        int spentAmount = 0;
        while ( (line = br.readLine()) != null && line.length() > 0)
        {
            debugLog("Processing line: " + line);
            // TODO Hacky "MADHESWARAN R,K" in the description is affecting the tokenizer with ","
			line = line.replace("MADHESWARAN R,K", "MADHESWARAN R");
			line = line.replace("POONGOTHAI M, S", "Poongothai Sunsundar");
			line = line.replace("N N SRIPRIYA,N", "N N SRIPRIYA");

            String[] transLine = line.replaceAll(" +", " ").split(",");
            debugLog("No of tokens: " + transLine.length);
            if (transLine.length < 3) continue;

            String transId = transLine[COL_BANK_TRANS_ID];
            if (transId.length() <= 0) {
                continue;
            }
            String transType = transLine[COL_TYPE];
            String transDesc = transLine[COL_DESC];
            int amountColumn = COL_AMOUNT;
            if (transType == null || !transType.equals("CR")){
                amountColumn += 1;
            }
            Float transAmount = processTransAmount(transLine[amountColumn], transLine);
            if (transAmount == null) {
                // bad amount field. skip the transaction
                continue;
            }

            if (transType == null || !transType.equals("CR")){
                // Transfers to beneficieries
                //System.out.println("---------------------------- " + transDesc);
                if (transDesc.contains("NEFT RTN") || transDesc.contains("REV IMPS")) {
                    // don't do anything
                } else if (transDesc.contains("NEFT")) {
                    // Updated index from 34 to 44 for 2025 format
                    int toStartSearchIndx = 44; // From Jan 2025
                    int indx = transDesc.indexOf('/', toStartSearchIndx); 
                    if (indx > 0) {
                        transDesc = transDesc.substring(toStartSearchIndx, indx);
                    } else {
                        transDesc = transDesc.substring(toStartSearchIndx);
                    }
                } else if (transDesc.contains("INFT")) {
                    // Handle INFT transactions (e.g., INF/INFT/032450733261/REDU500 Thrisha/MarudharKesariJ)
                    int indx = transDesc.indexOf('/', 22);
                    if (indx > 0) {
                        transDesc = transDesc.substring(22, indx);
                    } else {
                        transDesc = transDesc.substring(22);
                    }
                } else if (transDesc.contains("IMPS")) {
                    // Ignore "MMT/IMPS/929909608999/"
                    try {
                        transDesc = transDesc.substring(22, transDesc.indexOf('/', 22));
                    } catch (Exception e) {
                        throw e;
                    }
                } else {
                    // Handle ONL payments (e.g., "BIL/ONL/000640078426/AMAZON PAY/REDU487 Adhityn")
                    try {
                        int startIndx = transDesc.indexOf('/', 22) + 1;
                        transDesc = transDesc.substring(startIndx);
                    } catch (Exception e) {
                        // If parsing fails, keep the original description
                        System.out.println("Failed to parse description: " + transDesc);
                    }
                }

                debugLog("Spent transaction: " + transDesc + " # " + transAmount);
                spentAmountMap.put(transDesc, transAmount.toString());
                spentAmount += transAmount;
                continue;
            }

            String transDate = transLine[COL_VALUE_DATE];
            LocalDate ldt = parseTransactionDate(transDate);
            DateTimeFormatter destDateFormat = DateTimeFormatter.ISO_LOCAL_DATE;
            String formattedDate = ldt.format(destDateFormat).toString();

            String transName = transDesc;
            for (String name : transNameSet) {
                if (transDesc.toLowerCase().contains(name)) {
                    transName = name;
                    break;
                }
            }

            // Create a Transaction object
            Transaction transaction = new Transaction(transDesc, formattedDate, transId, transAmount);

            totalAmount += transAmount;
            if(identificationMap.containsKey(transName.toLowerCase()))
            {
                String[] displayData = identificationMap.get(transName.toLowerCase());
                String displayName = displayData[0];
                String displayID = displayData[1];
                
                // Check for duplicate display names and append a suffix if needed
                int i = 1;
                String originalDisplayName = displayName;
                while (isDuplicateDisplayName(displayName)) {
                    displayName = originalDisplayName + "-" + i;
                    i++;
                }
                
                if (!displayName.equals(originalDisplayName)) {
                    debugLog("Multiple transactions from same person: ["+displayName+"]");
                }

                transaction.setMid(displayID);
                transaction.setDisplayName(displayName);

                debugLog("Credit transaction: ["+displayName+", "+transAmount+"]");
            }
            
            // Add the transaction to the set
            transactions.add(transaction);

            // cleaning up the starting UTF8 bom character that gets added to the line. causes trouble while writing json
            if (line.startsWith(UTF8_BOM)) {
                line = line.substring(1);
            }
            
            // Convert Transaction object to JsonObject and add to outputJson
            Gson gson = new Gson();
            JsonObject innerObject = gson.toJsonTree(transaction).getAsJsonObject();
            outputJson.add(line, innerObject);
        }
        br.close();

        System.out.println("-------------------------- Total Spent: " + spentAmount);
        System.out.println("-------------------------- Total: " + totalAmount);
    }
    
    /**
     * Check if a display name already exists in the transactions set
     */
    private static boolean isDuplicateDisplayName(String displayName) {
        for (Transaction t : transactions) {
            if (displayName.equals(t.getDisplayName())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Process transaction amount string to a float value
     * Updated to use float for more precision
     */
    private static Float processTransAmount(String transAmount, String[] transLine) {
        if (transAmount.startsWith("\"")) {
            transAmount = transAmount + transLine[COL_AMOUNT + 1];
            transAmount = transAmount.replace("\"", "");
        }

        try {
            return Float.parseFloat(transAmount);
        } catch (NumberFormatException e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Parse transaction date string to LocalDate
     * Auto-detects format between d/M/yy and dd-MM-yyyy
     * 
     * @param dateStr The date string to parse
     * @return LocalDate object representing the parsed date
     */
    private static LocalDate parseTransactionDate(String dateStr) {
        // Try d/M/yy format first (e.g., 5/6/25)
        try {
            if (dateStr.contains("/")) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d/M/yy");
                return LocalDate.parse(dateStr, formatter);
            } else if (dateStr.contains("-")) {
                // Try dd-MM-yyyy format (e.g., 05-06-2025)
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
                return LocalDate.parse(dateStr, formatter);
            } else {
                // If neither format matches, throw an exception
                throw new IllegalArgumentException("Unsupported date format: " + dateStr);
            }
        } catch (Exception e) {
            System.err.println("Error parsing date: " + dateStr);
            throw e;
        }
    }

    private static void writeMapAsJson(String jsonPath) {
        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        BufferedWriter bw = null;
        try {
            bw = new BufferedWriter(new FileWriter(jsonPath));
            bw.write(gson.toJson(outputJson));
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (bw != null) {
                try {
                    bw.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
