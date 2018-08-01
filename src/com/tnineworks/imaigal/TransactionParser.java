package com.tnineworks.imaigal;

import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;


public class TransactionParser {

    public static String m_transactions = null;

    // Map has transaction remarks as key and Name identification as value
    private static HashMap<String, String[]> identificationMap = new HashMap<String, String[]>();
    private static TreeMap<String, String> transAmountMap = new TreeMap<String, String>();
    private static Set<String> transNameSet = new HashSet<String>();
    private static final String OUTPUTFILE_DEBUG_SPLIT = "-##-";

    public static void main(String[] args) throws IOException
    {
        m_transactions = args[0];
        populateIdentificationMap(args[1]);
        //System.out.println("Populated Identification Map: " + identificationMap);
        transNameSet = identificationMap.keySet();
        parseTxns(args[2]);
        printMap(args[3]);
    }

    private static void populateIdentificationMap(String input) throws IOException {
        BufferedReader br =  new BufferedReader(new FileReader(input));
        String line;

        int count = 0;
        while ( (line = br.readLine()) != null) {
            StringTokenizer st = new StringTokenizer(line, ",");
            String srcText = st.nextToken().trim().replaceAll(" +", " ");;
            String idText = st.nextToken().trim();
            String memberIdText = st.nextToken().trim();

            identificationMap.put(srcText.toLowerCase(), new String[] {idText, memberIdText});
        }
    }

    private static void printMap(String outputFile) throws IOException {
        BufferedWriter bw = null;
        try {
            bw = new BufferedWriter(new FileWriter(outputFile));
            String header = "member_id,description,date,bank_trans_id,amount";
            System.out.println(header);
            bw.write(header+"\n");
            Set<String> transName = transAmountMap.keySet();
            for (String name : transName) {
                String data = "" + name + "," + transAmountMap.get(name);
                System.out.println(data);
                bw.write(data.split(OUTPUTFILE_DEBUG_SPLIT)[0] + "\n");
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (bw != null) {
                bw.close();
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
        while ( (line = br.readLine()) != null && line.length() > 0)
        {
            //System.out.println("Processing line: " + line);
            String[] transLine = line.replaceAll(" +", " ").split(",");
            //System.out.println("No of tokens: " + transLine.length);
            if (transLine.length == 0) continue;

            String transType = transLine[COL_TYPE];
            if (transType == null || !transType.equals("CR"))
                continue;

            String transDate = transLine[COL_VALUE_DATE];
            DateTimeFormatter sourceDateFormat = DateTimeFormatter.ofPattern(dateFormat);
            DateTimeFormatter destDateFormat = DateTimeFormatter.ISO_LOCAL_DATE;
            LocalDate ldt = LocalDate.parse(transDate, sourceDateFormat);
            String formattedDate = ldt.format(destDateFormat).toString();

            String transId = transLine[COL_BANK_TRANS_ID];
            String transDesc = transLine[COL_DESC];
            String transName = transDesc;
            for (String name : transNameSet) {
                if (transDesc.toLowerCase().contains(name)) {
                    transName = name;
                    break;
                }
            }

            String transAmount = transLine[COL_AMOUNT];
            if (transAmount.startsWith("\"")) {
                transAmount = transAmount + transLine[COL_AMOUNT + 1];
                transAmount = transAmount.replace("\"", "");
            }

            //System.out.println(transName + " :  " + transType + " : " + transAmount);
            int dotIndx = transAmount.indexOf('.');
            if (dotIndx > 0) transAmount = transAmount.substring(0, dotIndx);
            totalAmount += Integer.parseInt(transAmount);
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
                //System.out.println("putting ["+displayName+", "+transAmount+"]");
                transAmountMap.put(displayID + "," + transDesc + "," + formattedDate + "," + transId, transAmount
                        + OUTPUTFILE_DEBUG_SPLIT + displayName);
            }
            else
            {
                transAmountMap.put(","+transDesc + "," + formattedDate + "," + transId, transAmount);
            }
        }
        br.close();
        System.out.println("-------------------------- Total: " + totalAmount);
    }
}
