package com.mobilux.repository;

import com.mobilux.entity.Bill;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByRepairId(Long repairId);
    Optional<Bill> findByRepairLogId(Long repairLogId);
    boolean existsByBillNumber(String billNumber);
}
