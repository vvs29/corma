package com.tnineworks.imaigal;

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
    private static TreeMap<String, String> transAmountMap = new TreeMap<String, String>();
    private static TreeMap<String, String> spentAmountMap = new TreeMap<String, String>();
    private static Set<String> transNameSet = new HashSet<String>();
    private static final String OUTPUTFILE_DEBUG_SPLIT = "-##-";
    private static JsonObject outputJson = null;
    public static final String UTF8_BOM = "\uFEFF";

    public static void main(String[] args) throws IOException
    {
        outputJson = new JsonObject();
        m_transactions = args[0];
        populateIdentificationMap(args[1]);
        System.out.println("Populated Identification Map: " + identificationMap);
        transNameSet = identificationMap.keySet();
        parseTxns(args[2]);
        printMap(args[3], args[4]);
        writeMapAsJson(args[5]);
    }

    private static void populateIdentificationMap(String input) throws IOException {
        BufferedReader br =  new BufferedReader(new FileReader(input));
        String line;

        int count = 0;
        while ( (line = br.readLine()) != null) {
            System.out.println(line);
            StringTokenizer st = new StringTokenizer(line, ",");
            String srcText = st.nextToken().trim().replaceAll(" +", " ");;
            String idText = st.nextToken().trim();
            String memberIdText = st.nextToken().trim();

            identificationMap.put(srcText.toLowerCase(), new String[] {idText, memberIdText});
        }
    }

    private static void printMap(String contributionOutput, String spentOutput) throws IOException {
        BufferedWriter contributionWriter = null;
        BufferedWriter spentWriter = null;
        try {
            contributionWriter = new BufferedWriter(new FileWriter(contributionOutput));
            String header = "name,member_id,description,date,bank_trans_id,amount";
            System.out.println(header);
            contributionWriter.write(header+"\n");
            Set<String> transLines = transAmountMap.keySet();
            for (String transLine : transLines) {
                String[] splitted = transAmountMap.get(transLine).split(OUTPUTFILE_DEBUG_SPLIT);
                String consoleData = null;
                if (splitted.length > 1) {
                    consoleData = splitted[1] + ",,,,," + splitted[0];
                } else {
                    consoleData = "," + transLine + "," + transAmountMap.get(transLine);
                }
                System.out.println(consoleData);
                contributionWriter.write(consoleData + "\n");
            }

            // now write spent details
            spentWriter = new BufferedWriter(new FileWriter(spentOutput));
            header = "transName,amount";
            spentWriter.write(header+"\n");
            Set<String> transNames = spentAmountMap.keySet();
            for (String transName : transNames) {
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

    private static void parseTxns(String dateFormat) throws IOException
    {
        BufferedReader br = new BufferedReader(new InputStreamReader(new FileInputStream(m_transactions)));
        String line = null;

        int totalAmount = 0;
        int spentAmount = 0;
        while ( (line = br.readLine()) != null && line.length() > 0)
        {
            //System.out.println("Processing line: " + line);
            // TODO Hacky "MADHESWARAN R,K" in the description is affecting the tokenizer with ","
            line = line.replace("MADHESWARAN R,K", "MADHESWARAN R");
            line = line.replace("POONGOTHAI M, S", "Poongothai Sunsundar");

            String[] transLine = line.replaceAll(" +", " ").split(",");
            //System.out.println("No of tokens: " + transLine.length);
            if (transLine.length == 0) continue;

            String transType = transLine[COL_TYPE];
            String transDesc = transLine[COL_DESC];
            Integer transAmount = processTransAmount(transLine[COL_AMOUNT], transLine);
            if (transAmount == null) {
                // bad amount field. skip the transaction
                continue;
            }

            if (transType == null || !transType.equals("CR")){
                // Transfers to beneficieries
                //System.out.println("---------------------------- " + transDesc);
                if (transDesc.contains("NEFT RTN")) {
                    // don't do anything
                } else if (transDesc.contains("NEFT")) {
                    //transDesc = transDesc.substring(transDesc.lastIndexOf('/') + 1);
                    transDesc = transDesc.substring(34, transDesc.indexOf('/', 34));
                } else {
                    // Ignore "MMT/IMPS/929909608999/"
                    transDesc = transDesc.substring(22, transDesc.indexOf('/', 22));
                }

                System.out.println(transDesc + " # " + transAmount);
                spentAmountMap.put(transDesc, transAmount.toString());
                spentAmount += transAmount;
                continue;
            }

            String transDate = transLine[COL_VALUE_DATE];
            DateTimeFormatter sourceDateFormat = DateTimeFormatter.ofPattern(dateFormat);
            DateTimeFormatter destDateFormat = DateTimeFormatter.ISO_LOCAL_DATE;
            LocalDate ldt = LocalDate.parse(transDate, sourceDateFormat);
            String formattedDate = ldt.format(destDateFormat).toString();

            String transId = transLine[COL_BANK_TRANS_ID];
            String transName = transDesc;
            for (String name : transNameSet) {
                if (transDesc.toLowerCase().contains(name)) {
                    transName = name;
                    break;
                }
            }

            String shortTransactionInfo = transDesc + "," + formattedDate + "," + transId;
            JsonObject innerObject = new JsonObject();
            innerObject.addProperty("shortTransactionInfo", shortTransactionInfo + "," + transAmount);

            totalAmount += transAmount;
            if(identificationMap.containsKey(transName.toLowerCase()))
            {
                String[] displayData = identificationMap.get(transName.toLowerCase());
                String displayName = displayData[0];
                String displayID = displayData[1];
                if (transAmountMap.containsKey(displayName)) {
                    int i = 1;
                    for (; transAmountMap.containsKey(displayName+"-"+i);i++);
                    // if the person made more than one transaction.
                    displayName = displayName+"-"+i;
                    //System.out.println("Overwriting: ["+displayName+"] " + transAmountMap.get(displayName));
                }

                innerObject.addProperty("mid", displayID);
                innerObject.addProperty("displayName", displayName);

                //System.out.println("putting ["+displayName+", "+transAmount+"]");
                transAmountMap.put(displayID + "," + shortTransactionInfo, transAmount
                        + OUTPUTFILE_DEBUG_SPLIT + displayName);
            }
            else
            {
                transAmountMap.put(","+shortTransactionInfo, transAmount.toString());
            }

            // cleaning up the starting UTF8 bom character that gets added to the line. causes trouble while writing json
            if (line.startsWith(UTF8_BOM)) {
                line = line.substring(1);
            }
            outputJson.add(line, innerObject);
        }
        br.close();

        System.out.println("-------------------------- Total Spent: " + spentAmount);
        System.out.println("-------------------------- Total: " + totalAmount);
    }

    private static Integer processTransAmount(String transAmount, String[] transLine) {
        if (transAmount.startsWith("\"")) {
            transAmount = transAmount + transLine[COL_AMOUNT + 1];
            transAmount = transAmount.replace("\"", "");
        }

        //System.out.println(transName + " :  " + transType + " : " + transAmount);
        int dotIndx = transAmount.indexOf('.');
        if (dotIndx > 0) transAmount = transAmount.substring(0, dotIndx);
        try {
            return Integer.parseInt(transAmount);
        } catch (NumberFormatException e) {
            e.printStackTrace();
            return null;
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
