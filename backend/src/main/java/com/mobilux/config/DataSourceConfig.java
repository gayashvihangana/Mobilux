package com.mobilux.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Custom DataSource configuration for production (Railway).
 * Railway provides DATABASE_URL in the format: postgresql://user:pass@host:port/dbname
 * Spring Boot requires: jdbc:postgresql://host:port/dbname with separate user/pass.
 * This config bridges that gap.
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");

        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            return buildDataSourceFromUrl(databaseUrl);
        }

        // Fallback: try individual PG* env vars
        String pgHost = System.getenv("PGHOST");
        if (pgHost != null && !pgHost.isEmpty()) {
            return buildDataSourceFromPgVars();
        }

        // Final fallback: use Spring Boot defaults from YAML
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost:5432/mobilux");
        ds.setUsername("mobilux");
        ds.setPassword("mobilux");
        return ds;
    }

    private DataSource buildDataSourceFromUrl(String databaseUrl) {
        try {
            // DATABASE_URL format: postgresql://user:password@host:port/dbname
            // or: postgres://user:password@host:port/dbname
            String cleanUrl = databaseUrl;
            if (cleanUrl.startsWith("postgres://")) {
                cleanUrl = cleanUrl.replace("postgres://", "postgresql://");
            }

            URI uri = new URI(cleanUrl);

            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath(); // e.g., /dbname
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;

            String userInfo = uri.getUserInfo();
            String username = "";
            String password = "";
            if (userInfo != null) {
                String[] parts = userInfo.split(":", 2);
                username = parts[0];
                if (parts.length > 1) {
                    password = parts[1];
                }
            }

            HikariDataSource ds = new HikariDataSource();
            ds.setJdbcUrl(jdbcUrl);
            ds.setUsername(username);
            ds.setPassword(password);
            return ds;

        } catch (URISyntaxException e) {
            throw new RuntimeException("Invalid DATABASE_URL: " + databaseUrl, e);
        }
    }

    private DataSource buildDataSourceFromPgVars() {
        String host = System.getenv("PGHOST");
        String port = getEnvOrDefault("PGPORT", "5432");
        String database = getEnvOrDefault("PGDATABASE", "mobilux");
        String username = getEnvOrDefault("PGUSER", "mobilux");
        String password = getEnvOrDefault("PGPASSWORD", "mobilux");

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        ds.setUsername(username);
        ds.setPassword(password);
        return ds;
    }

    private String getEnvOrDefault(String name, String defaultValue) {
        String value = System.getenv(name);
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
}
