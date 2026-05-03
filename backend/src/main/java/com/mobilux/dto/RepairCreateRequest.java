package com.mobilux.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class RepairCreateRequest {
    @NotNull
    private Long customerId;

    private Long assignedStaffId;

    @NotBlank
    private String deviceModel;

    @NotBlank
    private String issueDescription;

    @NotNull
    private BigDecimal cost;

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getAssignedStaffId() {
        return assignedStaffId;
    }

    public void setAssignedStaffId(Long assignedStaffId) {
        this.assignedStaffId = assignedStaffId;
    }

    public String getDeviceModel() {
        return deviceModel;
    }

    public void setDeviceModel(String deviceModel) {
        this.deviceModel = deviceModel;
    }

    public String getIssueDescription() {
        return issueDescription;
    }

    public void setIssueDescription(String issueDescription) {
        this.issueDescription = issueDescription;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }
}
