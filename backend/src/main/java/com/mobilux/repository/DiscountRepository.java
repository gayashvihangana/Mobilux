package com.mobilux.repository;

import com.mobilux.entity.Discount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscountRepository extends JpaRepository<Discount, Long> {
    Optional<Discount> findByUserIdAndActiveTrue(Long userId);
}
