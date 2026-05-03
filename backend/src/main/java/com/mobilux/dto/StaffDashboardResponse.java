package com.mobilux.dto;

import java.util.List;

public class StaffDashboardResponse {
    private List<RepairResponse> assignedRepairs;

    public StaffDashboardResponse(List<RepairResponse> assignedRepairs) {
        this.assignedRepairs = assignedRepairs;
    }

    public List<RepairResponse> getAssignedRepairs() {
        return assignedRepairs;
    }
}
