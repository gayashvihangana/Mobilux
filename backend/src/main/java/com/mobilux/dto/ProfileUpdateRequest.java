package com.mobilux.dto;

import jakarta.validation.constraints.NotBlank;

public class ProfileUpdateRequest {
    @NotBlank
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
