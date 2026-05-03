package com.mobilux.service;

import com.mobilux.dto.AdminDashboardResponse;
import com.mobilux.dto.CustomerDashboardResponse;
import com.mobilux.dto.DiscountResponse;
import com.mobilux.dto.RepairResponse;
import com.mobilux.dto.StaffDashboardResponse;
import com.mobilux.entity.User;
import com.mobilux.model.PaymentStatus;
import com.mobilux.model.RepairStatus;
import com.mobilux.repository.PaymentRepository;
import com.mobilux.repository.RepairRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private final RepairRepository repairRepository;
    private final PaymentRepository paymentRepository;
    private final RepairService repairService;
    private final DiscountService discountService;

    public DashboardService(RepairRepository repairRepository,
                            PaymentRepository paymentRepository,
                            RepairService repairService,
                            DiscountService discountService) {
        this.repairRepository = repairRepository;
        this.paymentRepository = paymentRepository;
        this.repairService = repairService;
        this.discountService = discountService;
    }

    public AdminDashboardResponse getAdminDashboard() {
        long totalRepairs = repairRepository.count();
        long pendingPayments = paymentRepository.findAll().stream()
            .filter(payment -> payment.getStatus() == PaymentStatus.PENDING)
            .count();
        long activeRepairs = repairRepository.findAll().stream()
            .filter(repair -> repair.getStatus() == RepairStatus.PENDING
                || repair.getStatus() == RepairStatus.IN_PROGRESS
                || repair.getStatus() == RepairStatus.READY_FOR_PICKUP)
            .count();
        BigDecimal totalRevenue = paymentRepository.findAll().stream()
            .filter(payment -> payment.getStatus() == PaymentStatus.VERIFIED)
            .map(payment -> payment.getAmount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new AdminDashboardResponse(totalRepairs, pendingPayments, activeRepairs, totalRevenue);
    }

    public CustomerDashboardResponse getCustomerDashboard(User user) {
        List<RepairResponse> repairs = repairService.toResponses(
            repairRepository.findByCustomerId(user.getId()));
        List<RepairResponse> active = repairs.stream()
            .filter(repair -> repair.getStatus() == RepairStatus.PENDING
                || repair.getStatus() == RepairStatus.IN_PROGRESS
                || repair.getStatus() == RepairStatus.READY_FOR_PICKUP)
            .collect(Collectors.toList());
        List<RepairResponse> history = repairs.stream()
            .filter(repair -> repair.getStatus() == RepairStatus.COMPLETED)
            .collect(Collectors.toList());
        DiscountResponse discount = discountService.getOrCreateDiscount(user);
        return new CustomerDashboardResponse(active, history, discount);
    }

    public StaffDashboardResponse getStaffDashboard(User user) {
        List<RepairResponse> repairs = repairService.getRepairsByStaff(user.getId());
        return new StaffDashboardResponse(repairs);
    }
}
