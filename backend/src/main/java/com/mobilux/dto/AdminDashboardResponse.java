package com.mobilux.dto;

import java.math.BigDecimal;

public class AdminDashboardResponse {
    private long totalRepairs;
    private long pendingPayments;
    private long activeRepairs;
    private BigDecimal totalRevenue;

    public AdminDashboardResponse(long totalRepairs, long pendingPayments, long activeRepairs, BigDecimal totalRevenue) {
        this.totalRepairs = totalRepairs;
        this.pendingPayments = pendingPayments;
        this.activeRepairs = activeRepairs;
        this.totalRevenue = totalRevenue;
    }

    public long getTotalRepairs() {
        return totalRepairs;
    }

    public long getPendingPayments() {
        return pendingPayments;
    }

    public long getActiveRepairs() {
        return activeRepairs;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }
}
