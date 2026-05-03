package com.mobilux.dto;

import java.util.List;

public class CustomerDashboardResponse {
    private List<RepairResponse> activeRepairs;
    private List<RepairResponse> repairHistory;
    private DiscountResponse discount;

    public CustomerDashboardResponse(List<RepairResponse> activeRepairs,
                                     List<RepairResponse> repairHistory,
                                     DiscountResponse discount) {
        this.activeRepairs = activeRepairs;
        this.repairHistory = repairHistory;
        this.discount = discount;
    }

    public List<RepairResponse> getActiveRepairs() {
        return activeRepairs;
    }

    public List<RepairResponse> getRepairHistory() {
        return repairHistory;
    }

    public DiscountResponse getDiscount() {
        return discount;
    }
}
