package com.mobilux.dto;

import com.mobilux.model.RepairStatus;
import java.math.BigDecimal;
import java.time.Instant;

public class RepairResponse {
    private Long id;
    private UserSummary customer;
    private UserSummary assignedStaff;
    private String deviceModel;
    private String issueDescription;
    private RepairStatus status;
    private BigDecimal cost;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant completedAt;

    public RepairResponse(Long id, UserSummary customer, UserSummary assignedStaff, String deviceModel,
                          String issueDescription, RepairStatus status, BigDecimal cost, Instant createdAt,
                          Instant updatedAt, Instant completedAt) {
        this.id = id;
        this.customer = customer;
        this.assignedStaff = assignedStaff;
        this.deviceModel = deviceModel;
        this.issueDescription = issueDescription;
        this.status = status;
        this.cost = cost;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.completedAt = completedAt;
    }

    public Long getId() {
        return id;
    }

    public UserSummary getCustomer() {
        return customer;
    }

    public UserSummary getAssignedStaff() {
        return assignedStaff;
    }

    public String getDeviceModel() {
        return deviceModel;
    }

    public String getIssueDescription() {
        return issueDescription;
    }

    public RepairStatus getStatus() {
        return status;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }
}
