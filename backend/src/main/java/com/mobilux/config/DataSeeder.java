package com.mobilux.config;

import com.mobilux.entity.Product;
import com.mobilux.entity.User;
import com.mobilux.model.ProductCategory;
import com.mobilux.model.Role;
import com.mobilux.repository.ProductRepository;
import com.mobilux.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {
    @Bean
    CommandLineRunner seedData(UserRepository userRepository,
                               ProductRepository productRepository,
                               PasswordEncoder passwordEncoder) {
        return args -> {
            userRepository.findByEmail("admin@mobilux.lk")
                .orElseGet(() -> {
                    User admin = new User();
                    admin.setName("Mobilux Owner");
                    admin.setEmail("admin@mobilux.lk");
                    admin.setPassword(passwordEncoder.encode("Admin@123"));
                    admin.setRole(Role.ADMIN);
                    return userRepository.save(admin);
                });

            if (productRepository.count() == 0) {
                List<Product> products = List.of(
                    new Product("iPhone 14", new BigDecimal("189000"), ProductCategory.PHONE, true),
                    new Product("Samsung Galaxy S23", new BigDecimal("174000"), ProductCategory.PHONE, true),
                    new Product("Premium Screen Protector", new BigDecimal("3500"), ProductCategory.ACCESSORY, true),
                    new Product("Fast Charger 25W", new BigDecimal("6900"), ProductCategory.ACCESSORY, true)
                );
                productRepository.saveAll(products);
            }
        };
    }
}
