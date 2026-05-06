package com.mobilux.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class BillResponse {
    private Long id;
    private String billNumber;
    private Long repairId;
    private String customerName;
    private String customerEmail;
    private String deviceModel;
    private String issueDescription;
    private String repairmanName;
    private String spareParts;
    private BigDecimal discount;
    private Integer loyaltyPoints;
    private String notes;
    private BigDecimal subTotal;
    private BigDecimal total;
    private BigDecimal amountPaid;
    private BigDecimal balance;
    private List<BillItemResponse> items;
    private Instant createdAt;

    public BillResponse(Long id,
                        String billNumber,
                        Long repairId,
                        String customerName,
                        String customerEmail,
                        String deviceModel,
                        String issueDescription,
                        String repairmanName,
                        String spareParts,
                        BigDecimal discount,
                        Integer loyaltyPoints,
                        String notes,
                        BigDecimal subTotal,
                        BigDecimal total,
                        BigDecimal amountPaid,
                        BigDecimal balance,
                        List<BillItemResponse> items,
                        Instant createdAt) {
        this.id = id;
        this.billNumber = billNumber;
        this.repairId = repairId;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.deviceModel = deviceModel;
        this.issueDescription = issueDescription;
        this.repairmanName = repairmanName;
        this.spareParts = spareParts;
        this.discount = discount;
        this.loyaltyPoints = loyaltyPoints;
        this.notes = notes;
        this.subTotal = subTotal;
        this.total = total;
        this.amountPaid = amountPaid;
        this.balance = balance;
        this.items = items;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getBillNumber() {
        return billNumber;
    }

    public Long getRepairId() {
        return repairId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public String getDeviceModel() {
        return deviceModel;
    }

    public String getIssueDescription() {
        return issueDescription;
    }

    public String getRepairmanName() {
        return repairmanName;
    }

    public String getSpareParts() {
        return spareParts;
    }

    public BigDecimal getDiscount() {
        return discount;
    }

    public Integer getLoyaltyPoints() {
        return loyaltyPoints;
    }

    public String getNotes() {
        return notes;
    }

    public BigDecimal getSubTotal() {
        return subTotal;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public BigDecimal getAmountPaid() {
        return amountPaid;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public List<BillItemResponse> getItems() {
        return items;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
