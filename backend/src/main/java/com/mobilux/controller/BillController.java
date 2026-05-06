package com.mobilux.controller;

import com.mobilux.dto.BillCreateRequest;
import com.mobilux.dto.BillResponse;
import com.mobilux.service.BillService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bills")
public class BillController {
    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<BillResponse> getBills() {
        return billService.getBills();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BillResponse getBill(@PathVariable Long id) {
        return billService.getBill(id);
    }

    @GetMapping("/repair/{repairId}")
    @PreAuthorize("hasRole('ADMIN')")
    public BillResponse getBillByRepair(@PathVariable Long repairId) {
        return billService.getBillByRepair(repairId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public BillResponse createBill(@Valid @RequestBody BillCreateRequest request) {
        return billService.createOrUpdateBill(request);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> getBillPdf(@PathVariable Long id) {
        byte[] pdf = billService.generatePdf(id);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mobilux-" + id + ".pdf")
            .body(pdf);
    }

    @GetMapping(value = "/{id}/html", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> getBillHtml(@PathVariable Long id) {
        String html = billService.generateHtml(id);
        return ResponseEntity.ok(html);
    }
}
