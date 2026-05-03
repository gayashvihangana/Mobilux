package com.mobilux.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "repair_logs")
public class RepairLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rep_id", nullable = false, length = 20)
    private String repId;

    @Column(name = "owner")
    private String owner;

    @Column(name = "brand")
    private String brand;

    @Column(name = "model")
    private String model;

    @Column(name = "issue", columnDefinition = "TEXT")
    private String issue;

    @Column(name = "solution", columnDefinition = "TEXT")
    private String solution;

    @Column(name = "completed")
    private Boolean completed = false;

    @Column(name = "cost", precision = 10, scale = 2)
    private BigDecimal cost;

    @Column(name = "payment", precision = 10, scale = 2)
    private BigDecimal payment;

    @Column(name = "profit", precision = 10, scale = 2)
    private BigDecimal profit;

    @Column(name = "date_completed")
    private LocalDate dateCompleted;

    @Column(name = "duration")
    private String duration;

    @Column(name = "parts", columnDefinition = "TEXT")
    private String parts;

    @Column(name = "shop", columnDefinition = "TEXT")
    private String shop;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "forgotten_parts", columnDefinition = "TEXT")
    private String forgottenParts;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRepId() { return repId; }
    public void setRepId(String repId) { this.repId = repId; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getIssue() { return issue; }
    public void setIssue(String issue) { this.issue = issue; }
    public String getSolution() { return solution; }
    public void setSolution(String solution) { this.solution = solution; }
    public Boolean getCompleted() { return completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }
    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
    public BigDecimal getPayment() { return payment; }
    public void setPayment(BigDecimal payment) { this.payment = payment; }
    public BigDecimal getProfit() { return profit; }
    public void setProfit(BigDecimal profit) { this.profit = profit; }
    public LocalDate getDateCompleted() { return dateCompleted; }
    public void setDateCompleted(LocalDate dateCompleted) { this.dateCompleted = dateCompleted; }
    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
    public String getParts() { return parts; }
    public void setParts(String parts) { this.parts = parts; }
    public String getShop() { return shop; }
    public void setShop(String shop) { this.shop = shop; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
    public String getForgottenParts() { return forgottenParts; }
    public void setForgottenParts(String forgottenParts) { this.forgottenParts = forgottenParts; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
