package com.mobilux.dto;

import com.mobilux.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public class PaymentResponse {
    private Long id;
    private Long repairId;
    private BigDecimal amount;
    private String receiptUrl;
    private PaymentStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public PaymentResponse(Long id, Long repairId, BigDecimal amount, String receiptUrl,
                           PaymentStatus status, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.repairId = repairId;
        this.amount = amount;
        this.receiptUrl = receiptUrl;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getRepairId() {
        return repairId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getReceiptUrl() {
        return receiptUrl;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
