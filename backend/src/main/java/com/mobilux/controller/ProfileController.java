package com.mobilux.controller;

import com.mobilux.dto.ProfileUpdateRequest;
import com.mobilux.dto.UserResponse;
import com.mobilux.security.SecurityUtils;
import com.mobilux.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
@PreAuthorize("hasAnyRole('ADMIN','CUSTOMER','STAFF')")
public class ProfileController {
    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public UserResponse getProfile() {
        String email = SecurityUtils.getCurrentUserEmail();
        return profileService.getProfile(email);
    }

    @PutMapping
    public UserResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        String email = SecurityUtils.getCurrentUserEmail();
        return profileService.updateProfile(email, request);
    }
}
