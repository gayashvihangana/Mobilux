package com.mobilux.repository;

import com.mobilux.entity.RepairLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RepairLogRepository extends JpaRepository<RepairLog, Long> {
    List<RepairLog> findAllByOrderByIdAsc();
}
