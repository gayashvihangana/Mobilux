package com.mobilux.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class DiscountResponse {
    private Long id;
    private BigDecimal percentage;
    private String eligibilityRules;
    private boolean active;
    private Instant createdAt;

    public DiscountResponse(Long id, BigDecimal percentage, String eligibilityRules, boolean active, Instant createdAt) {
        this.id = id;
        this.percentage = percentage;
        this.eligibilityRules = eligibilityRules;
        this.active = active;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public BigDecimal getPercentage() {
        return percentage;
    }

    public String getEligibilityRules() {
        return eligibilityRules;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
