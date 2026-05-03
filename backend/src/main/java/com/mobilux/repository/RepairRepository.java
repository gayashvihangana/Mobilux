package com.mobilux.repository;

import com.mobilux.entity.Repair;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepairRepository extends JpaRepository<Repair, Long> {
    List<Repair> findByCustomerId(Long customerId);
    List<Repair> findByAssignedStaffId(Long staffId);
}
