package com.mobilux.controller;

import com.mobilux.dto.ProfileUpdateRequest;
import com.mobilux.dto.UserResponse;
import com.mobilux.exception.BadRequestException;
import com.mobilux.security.SecurityUtils;
import com.mobilux.service.ProfileService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping("/avatar")
    public UserResponse uploadAvatar(@org.springframework.web.bind.annotation.RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Avatar file is required");
        }
        String extension = getExtension(file.getOriginalFilename());
        String filename = "avatar-" + UUID.randomUUID() + extension;
        Path uploadPath = Paths.get("uploads", "avatars");
        try {
            Files.createDirectories(uploadPath);
            Path destination = uploadPath.resolve(filename);
            file.transferTo(destination);
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store avatar");
        }
        String email = SecurityUtils.getCurrentUserEmail();
        return profileService.updateAvatar(email, "/uploads/avatars/" + filename);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }
}
