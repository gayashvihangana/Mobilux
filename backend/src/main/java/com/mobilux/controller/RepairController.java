package com.mobilux.controller;

import com.mobilux.dto.RepairCreateRequest;
import com.mobilux.dto.RepairResponse;
import com.mobilux.dto.RepairUpdateRequest;
import com.mobilux.security.SecurityUtils;
import com.mobilux.service.RepairService;
import com.mobilux.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/repairs")
public class RepairController {
    private final RepairService repairService;
    private final UserService userService;

    public RepairController(RepairService repairService, UserService userService) {
        this.repairService = repairService;
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<RepairResponse> getAllRepairs() {
        return repairService.getAllRepairs();
    }

    @GetMapping("/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<RepairResponse> getCustomerRepairs() {
        String email = SecurityUtils.getCurrentUserEmail();
        Long customerId = userService.getUserByEmail(email).getId();
        return repairService.getRepairsByCustomer(customerId);
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('STAFF')")
    public List<RepairResponse> getStaffRepairs() {
        String email = SecurityUtils.getCurrentUserEmail();
        Long staffId = userService.getUserByEmail(email).getId();
        return repairService.getRepairsByStaff(staffId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER','STAFF')")
    public RepairResponse getRepair(@PathVariable Long id) {
        return repairService.getRepair(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public RepairResponse createRepair(@Valid @RequestBody RepairCreateRequest request) {
        return repairService.createRepair(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public RepairResponse updateRepair(@PathVariable Long id, @RequestBody RepairUpdateRequest request) {
        return repairService.updateRepair(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteRepair(@PathVariable Long id) {
        repairService.deleteRepair(id);
    }
}
