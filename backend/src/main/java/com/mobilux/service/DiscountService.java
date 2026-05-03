package com.mobilux.service;

import com.mobilux.dto.DiscountResponse;
import com.mobilux.entity.Discount;
import com.mobilux.entity.User;
import com.mobilux.model.RepairStatus;
import com.mobilux.repository.DiscountRepository;
import com.mobilux.repository.RepairRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DiscountService {
    private final DiscountRepository discountRepository;
    private final RepairRepository repairRepository;

    public DiscountService(DiscountRepository discountRepository, RepairRepository repairRepository) {
        this.discountRepository = discountRepository;
        this.repairRepository = repairRepository;
    }

    public DiscountResponse getOrCreateDiscount(User user) {
        return discountRepository.findByUserIdAndActiveTrue(user.getId())
            .map(this::toResponse)
            .orElseGet(() -> calculateDiscount(user));
    }

    private DiscountResponse calculateDiscount(User user) {
        List<Long> completedRepairs = repairRepository.findByCustomerId(user.getId()).stream()
            .filter(repair -> repair.getStatus() == RepairStatus.COMPLETED
                || repair.getStatus() == RepairStatus.READY_FOR_PICKUP)
            .map(repair -> repair.getId())
            .toList();

        if (completedRepairs.size() >= 3) {
            Discount discount = new Discount();
            discount.setUser(user);
            discount.setPercentage(new BigDecimal("10"));
            discount.setEligibilityRules("Eligible after 3 completed repairs");
            discount.setActive(true);
            return toResponse(discountRepository.save(discount));
        }

        return new DiscountResponse(null, BigDecimal.ZERO, "Complete 3 repairs to unlock discount", false, null);
    }

    private DiscountResponse toResponse(Discount discount) {
        return new DiscountResponse(
            discount.getId(),
            discount.getPercentage(),
            discount.getEligibilityRules(),
            discount.isActive(),
            discount.getCreatedAt()
        );
    }
}
