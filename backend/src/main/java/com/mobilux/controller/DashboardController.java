package com.mobilux.controller;

import com.mobilux.dto.AdminDashboardResponse;
import com.mobilux.dto.CustomerDashboardResponse;
import com.mobilux.dto.StaffDashboardResponse;
import com.mobilux.entity.User;
import com.mobilux.exception.NotFoundException;
import com.mobilux.repository.UserRepository;
import com.mobilux.security.SecurityUtils;
import com.mobilux.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    public DashboardController(DashboardService dashboardService, UserRepository userRepository) {
        this.dashboardService = dashboardService;
        this.userRepository = userRepository;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDashboardResponse getAdminDashboard() {
        return dashboardService.getAdminDashboard();
    }

    @GetMapping("/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CustomerDashboardResponse getCustomerDashboard() {
        User user = getCurrentUser();
        return dashboardService.getCustomerDashboard(user);
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('STAFF')")
    public StaffDashboardResponse getStaffDashboard() {
        User user = getCurrentUser();
        return dashboardService.getStaffDashboard(user);
    }

    private User getCurrentUser() {
        String email = SecurityUtils.getCurrentUserEmail();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
