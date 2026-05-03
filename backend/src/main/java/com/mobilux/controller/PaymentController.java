package com.mobilux.controller;

import com.mobilux.dto.PaymentCreateRequest;
import com.mobilux.dto.PaymentResponse;
import com.mobilux.dto.PaymentStatusUpdateRequest;
import com.mobilux.entity.User;
import com.mobilux.model.Role;
import com.mobilux.security.SecurityUtils;
import com.mobilux.service.PaymentService;
import com.mobilux.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;
    private final UserService userService;

    public PaymentController(PaymentService paymentService, UserService userService) {
        this.paymentService = paymentService;
        this.userService = userService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse createPayment(@Valid @RequestBody PaymentCreateRequest request) {
        User user = userService.getUserByEmail(SecurityUtils.getCurrentUserEmail());
        return paymentService.createPaymentForCustomer(request, user);
    }

    @PostMapping("/{paymentId}/receipt")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse uploadReceipt(@PathVariable Long paymentId,
                                         @RequestParam("file") MultipartFile file) {
        return paymentService.uploadReceipt(paymentId, file);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<PaymentResponse> getPayments() {
        return paymentService.getAllPayments();
    }

    @GetMapping("/repair/{repairId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public PaymentResponse getPaymentByRepair(@PathVariable Long repairId) {
        User user = userService.getUserByEmail(SecurityUtils.getCurrentUserEmail());
        if (user.getRole() == Role.CUSTOMER) {
            return paymentService.getPaymentForCustomerRepair(repairId, user);
        }
        return paymentService.getPaymentByRepair(repairId);
    }

    @PatchMapping("/{paymentId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public PaymentResponse updateStatus(@PathVariable Long paymentId,
                                        @Valid @RequestBody PaymentStatusUpdateRequest request) {
        return paymentService.updateStatus(paymentId, request.getStatus());
    }
}
