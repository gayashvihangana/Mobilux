package com.mobilux.controller;

import com.mobilux.entity.RepairLog;
import com.mobilux.exception.NotFoundException;
import com.mobilux.repository.RepairLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/repair-logs")
public class RepairLogController {

    private final RepairLogRepository repo;

    public RepairLogController(RepairLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<List<RepairLog>> getAll() {
        return ResponseEntity.ok(repo.findAllByOrderByIdAsc());
    }

    @PostMapping
    public ResponseEntity<RepairLog> create(@RequestBody RepairLog body) {
        body.setId(null);
        body.setCreatedAt(LocalDateTime.now());
        body.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repo.save(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepairLog> update(@PathVariable Long id, @RequestBody RepairLog body) {
        RepairLog existing = repo.findById(id)
            .orElseThrow(() -> new NotFoundException("Repair log not found"));
        body.setId(existing.getId());
        body.setCreatedAt(existing.getCreatedAt());
        body.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repo.save(body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        RepairLog existing = repo.findById(id)
            .orElseThrow(() -> new NotFoundException("Repair log not found"));
        repo.delete(existing);
        return ResponseEntity.noContent().build();
    }
}

