package com.tnineworks.imaigal;

/**
 * Transaction - POJO to hold transaction data
 * 
 * This class represents a single transaction with all its details.
 */
public class Transaction {
    private String transactionDescription;
    private String transactionDate;
    private String transactionId;
    private Float transactionAmount;
    private String mid;
    private String displayName;
    
    // Constructors
    public Transaction() {}
    
    public Transaction(String transactionDescription, String transactionDate, 
                      String transactionId, Float transactionAmount) {
        this.transactionDescription = transactionDescription;
        this.transactionDate = transactionDate;
        this.transactionId = transactionId;
        this.transactionAmount = transactionAmount;
    }
    
    // Getters and setters
    public String getTransactionDescription() {
        return transactionDescription;
    }
    
    public void setTransactionDescription(String transactionDescription) {
        this.transactionDescription = transactionDescription;
    }
    
    public String getTransactionDate() {
        return transactionDate;
    }
    
    public void setTransactionDate(String transactionDate) {
        this.transactionDate = transactionDate;
    }
    
    public String getTransactionId() {
        return transactionId;
    }
    
    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
    
    public Float getTransactionAmount() {
        return transactionAmount;
    }
    
    public void setTransactionAmount(Float transactionAmount) {
        this.transactionAmount = transactionAmount;
    }
    
    public String getMid() {
        return mid;
    }
    
    public void setMid(String mid) {
        this.mid = mid;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
