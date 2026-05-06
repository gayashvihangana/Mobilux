package com.mobilux.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.mobilux.dto.BillCreateRequest;
import com.mobilux.dto.BillItemRequest;
import com.mobilux.dto.BillItemResponse;
import com.mobilux.dto.BillResponse;
import com.mobilux.entity.Bill;
import com.mobilux.entity.BillItem;
import com.mobilux.entity.Repair;
import com.mobilux.entity.User;
import com.mobilux.exception.BadRequestException;
import com.mobilux.exception.NotFoundException;
import com.mobilux.repository.BillRepository;
import com.mobilux.repository.RepairRepository;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class BillService {
    private final BillRepository billRepository;
    private final RepairRepository repairRepository;

    public BillService(BillRepository billRepository, RepairRepository repairRepository) {
        this.billRepository = billRepository;
        this.repairRepository = repairRepository;
    }

    public BillResponse createOrUpdateBill(BillCreateRequest request) {
        Repair repair = repairRepository.findById(request.getRepairId())
            .orElseThrow(() -> new NotFoundException("Repair not found"));
        Bill bill = billRepository.findByRepairId(repair.getId()).orElseGet(Bill::new);
        boolean isNew = bill.getId() == null;
        if (isNew) {
            bill.setBillNumber(generateBillNumber());
            bill.setRepair(repair);
        }

        User customer = repair.getCustomer();
        bill.setCustomerName(customer.getName());
        bill.setCustomerEmail(customer.getEmail());
        bill.setDeviceModel(repair.getDeviceModel());
        bill.setIssueDescription(repair.getIssueDescription());
        bill.setRepairmanName(resolveRepairmanName(repair, request.getRepairmanName()));
        bill.setSpareParts(request.getSpareParts());
        bill.setDiscount(request.getDiscount());
        bill.setLoyaltyPoints(request.getLoyaltyPoints());
        bill.setNotes(request.getNotes());
        bill.setAmountPaid(request.getAmountPaid());

        List<BillItem> items = toBillItems(bill, request.getItems());
        bill.getItems().clear();
        bill.getItems().addAll(items);

        BigDecimal subTotal = items.stream()
            .map(BillItem::getLineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Discount cannot be negative");
        }
        BigDecimal total = subTotal.subtract(discount);
        if (total.compareTo(BigDecimal.ZERO) < 0) {
            total = BigDecimal.ZERO;
        }

        BigDecimal amountPaid = request.getAmountPaid() != null ? request.getAmountPaid() : BigDecimal.ZERO;
        if (amountPaid.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Amount paid cannot be negative");
        }
        BigDecimal balance = total.subtract(amountPaid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            balance = BigDecimal.ZERO;
        }

        bill.setSubTotal(subTotal);
        bill.setTotal(total);
        bill.setAmountPaid(amountPaid);

        return toResponse(billRepository.save(bill));
    }

    public List<BillResponse> getBills() {
        List<BillResponse> responses = new ArrayList<>();
        for (Bill bill : billRepository.findAll()) {
            responses.add(toResponse(bill));
        }
        return responses;
    }

    public BillResponse getBill(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Bill not found"));
        return toResponse(bill);
    }

    public BillResponse getBillByRepair(Long repairId) {
        Bill bill = billRepository.findByRepairId(repairId)
            .orElseThrow(() -> new NotFoundException("Bill not found"));
        return toResponse(bill);
    }

    public byte[] generatePdf(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Bill not found"));
        BigDecimal paid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balance = bill.getTotal().subtract(paid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            balance = BigDecimal.ZERO;
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        try {
            PdfWriter.getInstance(document, output);
            document.open();

            Font title = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font heading = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font body = new Font(Font.HELVETICA, 10, Font.NORMAL);

            Paragraph header = new Paragraph("Mobilux Repair Bill", title);
            header.setAlignment(Element.ALIGN_LEFT);
            document.add(header);
            document.add(new Paragraph("Bill No: " + bill.getBillNumber(), body));
            document.add(new Paragraph("Date: " + LocalDate.now(), body));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Customer", heading));
            document.add(new Paragraph(bill.getCustomerName() + " (" + bill.getCustomerEmail() + ")", body));
            document.add(new Paragraph("Device: " + bill.getDeviceModel(), body));
            document.add(new Paragraph("Issue: " + bill.getIssueDescription(), body));
            document.add(new Paragraph("Repairman: " + bill.getRepairmanName(), body));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[] { 4f, 1f, 2f, 2f });
            table.setWidthPercentage(100);
            addHeaderCell(table, "Item", heading);
            addHeaderCell(table, "Qty", heading);
            addHeaderCell(table, "Unit", heading);
            addHeaderCell(table, "Line", heading);

            for (BillItem item : bill.getItems()) {
                table.addCell(new PdfPCell(new Phrase(item.getDescription(), body)));
                table.addCell(new PdfPCell(new Phrase(String.valueOf(item.getQuantity()), body)));
                table.addCell(new PdfPCell(new Phrase(formatMoney(item.getUnitPrice()), body)));
                table.addCell(new PdfPCell(new Phrase(formatMoney(item.getLineTotal()), body)));
            }
            document.add(table);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Subtotal: " + formatMoney(bill.getSubTotal()), body));
            document.add(new Paragraph("Discount: " + formatMoney(bill.getDiscount()), body));
            document.add(new Paragraph("Total: " + formatMoney(bill.getTotal()), heading));
            document.add(new Paragraph("Paid: " + formatMoney(paid), body));
            document.add(new Paragraph("Balance: " + formatMoney(balance), body));
            document.add(new Paragraph("Loyalty points: " + safeInt(bill.getLoyaltyPoints()), body));

            if (bill.getSpareParts() != null && !bill.getSpareParts().isBlank()) {
                document.add(new Paragraph("Spare parts: " + bill.getSpareParts(), body));
            }
            if (bill.getNotes() != null && !bill.getNotes().isBlank()) {
                document.add(new Paragraph("Notes: " + bill.getNotes(), body));
            }

        } catch (DocumentException ex) {
            throw new BadRequestException("Failed to generate PDF");
        } finally {
            document.close();
        }
        return output.toByteArray();
    }

    public String generateHtml(Long id) {
        Bill bill = billRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Bill not found"));
        BigDecimal paid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balance = bill.getTotal().subtract(paid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            balance = BigDecimal.ZERO;
        }

        StringBuilder html = new StringBuilder();
        html.append("<!doctype html><html><head><meta charset=\"utf-8\" />");
        html.append("<title>Mobilux Bill</title>");
        html.append("<style>");
        html.append("body{font-family:Arial,sans-serif;margin:24px;color:#0f172a;}");
        html.append("h1{font-size:20px;margin:0 0 12px;}");
        html.append(".meta{color:#475569;font-size:12px;margin-bottom:16px;}");
        html.append("table{width:100%;border-collapse:collapse;margin-top:12px;}");
        html.append("th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px;}");
        html.append("th{background:#f8fafc;}");
        html.append(".total{font-size:14px;font-weight:700;}");
        html.append(".section{margin-top:16px;}");
        html.append("</style></head><body>");
        html.append("<h1>Mobilux Repair Bill</h1>");
        html.append("<div class=\"meta\">Bill No: ").append(escapeHtml(bill.getBillNumber())).append("</div>");
        html.append("<div class=\"meta\">Date: ").append(LocalDate.now()).append("</div>");

        html.append("<div class=\"section\"><strong>Customer</strong><br/>");
        html.append(escapeHtml(bill.getCustomerName())).append(" (")
            .append(escapeHtml(bill.getCustomerEmail())).append(")<br/>");
        html.append("Device: ").append(escapeHtml(bill.getDeviceModel())).append("<br/>");
        html.append("Issue: ").append(escapeHtml(bill.getIssueDescription())).append("<br/>");
        html.append("Repairman: ").append(escapeHtml(bill.getRepairmanName())).append("</div>");

        html.append("<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Line</th></tr></thead><tbody>");
        for (BillItem item : bill.getItems()) {
            html.append("<tr><td>").append(escapeHtml(item.getDescription())).append("</td>")
                .append("<td>").append(item.getQuantity()).append("</td>")
                .append("<td>").append(formatMoney(item.getUnitPrice())).append("</td>")
                .append("<td>").append(formatMoney(item.getLineTotal())).append("</td></tr>");
        }
        html.append("</tbody></table>");

        html.append("<div class=\"section\">");
        html.append("Subtotal: ").append(formatMoney(bill.getSubTotal())).append("<br/>");
        html.append("Discount: ").append(formatMoney(bill.getDiscount())).append("<br/>");
        html.append("<span class=\"total\">Total: ").append(formatMoney(bill.getTotal())).append("</span><br/>");
        html.append("Paid: ").append(formatMoney(paid)).append("<br/>");
        html.append("Balance: ").append(formatMoney(balance)).append("<br/>");
        html.append("Loyalty points: ").append(safeInt(bill.getLoyaltyPoints())).append("</div>");

        if (bill.getSpareParts() != null && !bill.getSpareParts().isBlank()) {
            html.append("<div class=\"section\"><strong>Spare parts</strong><br/>")
                .append(escapeHtml(bill.getSpareParts())).append("</div>");
        }
        if (bill.getNotes() != null && !bill.getNotes().isBlank()) {
            html.append("<div class=\"section\"><strong>Notes</strong><br/>")
                .append(escapeHtml(bill.getNotes())).append("</div>");
        }

        html.append("</body></html>");
        return html.toString();
    }

    private List<BillItem> toBillItems(Bill bill, List<BillItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("At least one bill item is required");
        }
        List<BillItem> mapped = new ArrayList<>();
        for (BillItemRequest request : items) {
            BillItem item = new BillItem();
            item.setBill(bill);
            item.setDescription(request.getDescription());
            item.setQuantity(request.getQuantity());
            item.setUnitPrice(request.getUnitPrice());
            BigDecimal line = request.getUnitPrice().multiply(BigDecimal.valueOf(request.getQuantity()));
            item.setLineTotal(line);
            mapped.add(item);
        }
        return mapped;
    }

    private String resolveRepairmanName(Repair repair, String requested) {
        if (requested != null && !requested.isBlank()) {
            return requested;
        }
        if (repair.getAssignedStaff() != null) {
            return repair.getAssignedStaff().getName();
        }
        return "Unassigned";
    }

    private String generateBillNumber() {
        String year = String.valueOf(LocalDate.now().getYear());
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        String number = "BILL-" + year + "-" + token;
        while (billRepository.existsByBillNumber(number)) {
            token = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
            number = "BILL-" + year + "-" + token;
        }
        return number;
    }

    private BillResponse toResponse(Bill bill) {
        List<BillItemResponse> items = new ArrayList<>();
        for (BillItem item : bill.getItems()) {
            items.add(new BillItemResponse(item.getDescription(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal()));
        }
        BigDecimal amountPaid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balance = bill.getTotal().subtract(amountPaid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            balance = BigDecimal.ZERO;
        }
        return new BillResponse(
            bill.getId(),
            bill.getBillNumber(),
            bill.getRepair().getId(),
            bill.getCustomerName(),
            bill.getCustomerEmail(),
            bill.getDeviceModel(),
            bill.getIssueDescription(),
            bill.getRepairmanName(),
            bill.getSpareParts(),
            bill.getDiscount(),
            bill.getLoyaltyPoints(),
            bill.getNotes(),
            bill.getSubTotal(),
            bill.getTotal(),
            amountPaid,
            balance,
            items,
            bill.getCreatedAt()
        );
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setPadding(6);
        table.addCell(cell);
    }

    private String formatMoney(BigDecimal amount) {
        BigDecimal value = amount != null ? amount : BigDecimal.ZERO;
        NumberFormat format = NumberFormat.getCurrencyInstance(new Locale("en", "LK"));
        format.setMaximumFractionDigits(2);
        return format.format(value);
    }

    private String safeInt(Integer value) {
        return value == null ? "0" : String.valueOf(value);
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
