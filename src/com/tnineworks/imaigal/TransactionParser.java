package com.tnineworks.imaigal;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.StringTokenizer;
import java.util.TreeMap;


public class TransactionParser {

    public static String m_transactions = null;

    // Map has transaction remarks as key and Name identification as value
    private static HashMap<String, String> identificationMap = new HashMap<String, String>();
    private static TreeMap<String, String> transAmountMap = new TreeMap<String, String>();
    private static Set<String> transNameSet = new HashSet<String>();

    public static void main(String[] args) throws IOException
    {
        m_transactions = args[0];
        populateIdentificationMap(args[1]);
        //System.out.println("Populated Identification Map: " + identificationMap);
        transNameSet = identificationMap.keySet();
        parseTxns();
        printMap();
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

            identificationMap.put(srcText.toLowerCase(), idText);
        }
    }

    private static void printMap()
    {
        Set<String> transName = transAmountMap.keySet();
        for (String name : transName)
        {
            System.out.println("" + name + " :   " + transAmountMap.get(name) );
        }
    }

    // 0 based index
    static int COL_DESC = 4;
    static int COL_TYPE = COL_DESC + 1;
    static int COL_AMOUNT = COL_TYPE + 1;

    private static void parseTxns() throws IOException
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
                String displayName = identificationMap.get(transName.toLowerCase());
                if (transAmountMap.containsKey(displayName)) {
                    int i = 1;
                    for (; transAmountMap.containsKey(displayName+"-"+i);i++);
                    // if the person made more than one transaction.
                    displayName = displayName+"-"+i;
                    //System.out.println("Overwriting: ["+displayName+"] " + transAmountMap.get(displayName));
                }
                //System.out.println("putting ["+displayName+", "+transAmount+"]");
                transAmountMap.put(displayName, transAmount);
            }
            else
            {
                transAmountMap.put("Unknown --> "+transName, transAmount);
            }
        }
        br.close();
        System.out.println("-------------------------- Total: " + totalAmount);
    }
}
