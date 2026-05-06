package com.mobilux.service;

import com.mobilux.dto.AuthRequest;
import com.mobilux.dto.AuthResponse;
import com.mobilux.dto.SignupRequest;
import com.mobilux.entity.User;
import com.mobilux.exception.BadRequestException;
import com.mobilux.model.Role;
import com.mobilux.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.CUSTOMER);
        User saved = userRepository.save(user);
        return new AuthResponse("", saved.getRole().name(), saved.getName(), saved.getEmail());
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadRequestException("Invalid credentials"));
        return new AuthResponse("", user.getRole().name(), user.getName(), user.getEmail());
    }

    public AuthResponse getAuthResponseByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Invalid credentials"));
        return new AuthResponse("", user.getRole().name(), user.getName(), user.getEmail());
    }
}
