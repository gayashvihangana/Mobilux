package com.mobilux.service;

import com.mobilux.dto.ProfileUpdateRequest;
import com.mobilux.dto.UserResponse;
import com.mobilux.entity.User;
import com.mobilux.exception.NotFoundException;
import com.mobilux.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {
    private final UserRepository userRepository;

    public ProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.getAvatarUrl());
    }

    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
        user.setName(request.getName());
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        User saved = userRepository.save(user);
        return new UserResponse(saved.getId(), saved.getName(), saved.getEmail(), saved.getRole().name(), saved.getAvatarUrl());
    }

    public UserResponse updateAvatar(String email, String avatarUrl) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
        user.setAvatarUrl(avatarUrl);
        User saved = userRepository.save(user);
        return new UserResponse(saved.getId(), saved.getName(), saved.getEmail(), saved.getRole().name(), saved.getAvatarUrl());
    }
}
