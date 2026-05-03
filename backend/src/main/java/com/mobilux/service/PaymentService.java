package com.mobilux.service;

import com.mobilux.dto.PaymentCreateRequest;
import com.mobilux.dto.PaymentResponse;
import com.mobilux.entity.Payment;
import com.mobilux.entity.Repair;
import com.mobilux.entity.User;
import com.mobilux.exception.BadRequestException;
import com.mobilux.exception.NotFoundException;
import com.mobilux.model.PaymentStatus;
import com.mobilux.repository.PaymentRepository;
import com.mobilux.repository.RepairRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final RepairRepository repairRepository;

    public PaymentService(PaymentRepository paymentRepository, RepairRepository repairRepository) {
        this.paymentRepository = paymentRepository;
        this.repairRepository = repairRepository;
    }

    public PaymentResponse createPaymentForCustomer(PaymentCreateRequest request, User customer) {
        Repair repair = repairRepository.findById(request.getRepairId())
            .orElseThrow(() -> new NotFoundException("Repair not found"));
        if (!repair.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("Repair does not belong to customer");
        }
        if (paymentRepository.findByRepairId(repair.getId()).isPresent()) {
            throw new BadRequestException("Payment already exists for this repair");
        }
        Payment payment = new Payment();
        payment.setRepair(repair);
        payment.setAmount(request.getAmount());
        payment.setStatus(PaymentStatus.PENDING);
        return toResponse(paymentRepository.save(payment));
    }

    public PaymentResponse uploadReceipt(Long paymentId, MultipartFile file) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new NotFoundException("Payment not found"));
        if (file.isEmpty()) {
            throw new BadRequestException("Receipt file is required");
        }
        String extension = getExtension(file.getOriginalFilename());
        String filename = "receipt-" + UUID.randomUUID() + extension;
        Path uploadPath = Paths.get("uploads", "receipts");
        try {
            Files.createDirectories(uploadPath);
            Path destination = uploadPath.resolve(filename);
            file.transferTo(destination);
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store receipt");
        }
        payment.setReceiptUrl("/uploads/receipts/" + filename);
        payment.setStatus(PaymentStatus.PENDING);
        return toResponse(paymentRepository.save(payment));
    }

    public PaymentResponse updateStatus(Long paymentId, PaymentStatus status) {
        Payment payment = paymentRepository.findById(paymentId)
            .orElseThrow(() -> new NotFoundException("Payment not found"));
        payment.setStatus(status);
        return toResponse(paymentRepository.save(payment));
    }

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAll().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public PaymentResponse getPaymentByRepair(Long repairId) {
        Payment payment = paymentRepository.findByRepairId(repairId)
            .orElseThrow(() -> new NotFoundException("Payment not found"));
        return toResponse(payment);
    }

    public PaymentResponse getPaymentForCustomerRepair(Long repairId, User customer) {
        Payment payment = paymentRepository.findByRepairId(repairId)
            .orElseThrow(() -> new NotFoundException("Payment not found"));
        if (!payment.getRepair().getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("Payment does not belong to customer");
        }
        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getRepair().getId(),
            payment.getAmount(),
            payment.getReceiptUrl(),
            payment.getStatus(),
            payment.getCreatedAt(),
            payment.getUpdatedAt()
        );
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }
}
