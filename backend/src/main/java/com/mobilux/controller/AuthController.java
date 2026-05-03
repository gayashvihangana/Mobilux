package com.mobilux.controller;

import com.mobilux.dto.AuthRequest;
import com.mobilux.dto.AuthResponse;
import com.mobilux.dto.SignupRequest;
import com.mobilux.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    @Value("${security.jwt.expiration-minutes}")
    private long expirationMinutes;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request,
                                               HttpServletResponse response) {
        AuthResponse authResponse = authService.signup(request);
        addAuthCookie(response, authResponse.getToken());
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request,
                                              HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request);
        addAuthCookie(response, authResponse.getToken());
        return ResponseEntity.ok(authResponse);
    }

    private void addAuthCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("mobilux_token", token)
            .httpOnly(true)
            .path("/")
            .sameSite("Lax")
            .maxAge(Duration.ofMinutes(expirationMinutes))
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
