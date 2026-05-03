package com.mobilux.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PaymentCreateRequest {
    @NotNull
    private Long repairId;

    @NotNull
    private BigDecimal amount;

    public Long getRepairId() {
        return repairId;
    }

    public void setRepairId(Long repairId) {
        this.repairId = repairId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
