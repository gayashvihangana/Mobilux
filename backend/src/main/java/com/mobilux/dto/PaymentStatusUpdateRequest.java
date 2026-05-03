package com.mobilux.dto;

import com.mobilux.model.PaymentStatus;
import jakarta.validation.constraints.NotNull;

public class PaymentStatusUpdateRequest {
    @NotNull
    private PaymentStatus status;

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }
}
