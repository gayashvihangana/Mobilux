package com.mobilux.exception;

import java.time.Instant;

public class ApiError {
    private Instant timestamp;
    private int status;
    private String message;

    public ApiError(int status, String message) {
        this.timestamp = Instant.now();
        this.status = status;
        this.message = message;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public int getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
