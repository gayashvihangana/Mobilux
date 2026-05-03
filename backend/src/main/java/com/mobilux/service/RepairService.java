package com.mobilux.service;

import com.mobilux.dto.RepairCreateRequest;
import com.mobilux.dto.RepairResponse;
import com.mobilux.dto.RepairUpdateRequest;
import com.mobilux.dto.UserSummary;
import com.mobilux.entity.Repair;
import com.mobilux.entity.User;
import com.mobilux.exception.NotFoundException;
import com.mobilux.model.RepairStatus;
import com.mobilux.repository.RepairRepository;
import com.mobilux.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class RepairService {
    private final RepairRepository repairRepository;
    private final UserRepository userRepository;

    public RepairService(RepairRepository repairRepository, UserRepository userRepository) {
        this.repairRepository = repairRepository;
        this.userRepository = userRepository;
    }

    public RepairResponse createRepair(RepairCreateRequest request) {
        User customer = userRepository.findById(request.getCustomerId())
            .orElseThrow(() -> new NotFoundException("Customer not found"));
        User staff = null;
        if (request.getAssignedStaffId() != null) {
            staff = userRepository.findById(request.getAssignedStaffId())
                .orElseThrow(() -> new NotFoundException("Staff not found"));
        }
        Repair repair = new Repair();
        repair.setCustomer(customer);
        repair.setAssignedStaff(staff);
        repair.setDeviceModel(request.getDeviceModel());
        repair.setIssueDescription(request.getIssueDescription());
        repair.setCost(request.getCost());
        repair.setStatus(RepairStatus.PENDING);
        return toResponse(repairRepository.save(repair));
    }

    public RepairResponse updateRepair(Long id, RepairUpdateRequest request) {
        Repair repair = repairRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Repair not found"));
        if (request.getAssignedStaffId() != null) {
            User staff = userRepository.findById(request.getAssignedStaffId())
                .orElseThrow(() -> new NotFoundException("Staff not found"));
            repair.setAssignedStaff(staff);
        }
        if (request.getDeviceModel() != null && !request.getDeviceModel().isBlank()) {
            repair.setDeviceModel(request.getDeviceModel());
        }
        if (request.getIssueDescription() != null && !request.getIssueDescription().isBlank()) {
            repair.setIssueDescription(request.getIssueDescription());
        }
        if (request.getCost() != null) {
            repair.setCost(request.getCost());
        }
        if (request.getStatus() != null) {
            repair.setStatus(request.getStatus());
            if (request.getStatus() == RepairStatus.COMPLETED || request.getStatus() == RepairStatus.READY_FOR_PICKUP) {
                if (repair.getCompletedAt() == null) {
                    repair.setCompletedAt(Instant.now());
                }
            }
        }
        return toResponse(repairRepository.save(repair));
    }

    public void deleteRepair(Long id) {
        if (!repairRepository.existsById(id)) {
            throw new NotFoundException("Repair not found");
        }
        repairRepository.deleteById(id);
    }

    public List<RepairResponse> getAllRepairs() {
        return repairRepository.findAll().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<RepairResponse> getRepairsByCustomer(Long customerId) {
        return repairRepository.findByCustomerId(customerId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<RepairResponse> getRepairsByStaff(Long staffId) {
        return repairRepository.findByAssignedStaffId(staffId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public RepairResponse getRepair(Long id) {
        Repair repair = repairRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Repair not found"));
        return toResponse(repair);
    }

    public List<RepairResponse> toResponses(List<Repair> repairs) {
        return repairs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    private RepairResponse toResponse(Repair repair) {
        User customer = repair.getCustomer();
        User staff = repair.getAssignedStaff();
        UserSummary customerSummary = new UserSummary(customer.getId(), customer.getName(), customer.getEmail(),
            customer.getRole().name());
        UserSummary staffSummary = null;
        if (staff != null) {
            staffSummary = new UserSummary(staff.getId(), staff.getName(), staff.getEmail(), staff.getRole().name());
        }
        return new RepairResponse(
            repair.getId(),
            customerSummary,
            staffSummary,
            repair.getDeviceModel(),
            repair.getIssueDescription(),
            repair.getStatus(),
            repair.getCost(),
            repair.getCreatedAt(),
            repair.getUpdatedAt(),
            repair.getCompletedAt()
        );
    }
}
