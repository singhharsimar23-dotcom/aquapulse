package com.aquapulse.common.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Resilient HikariCP DataSource configuration tailored for Neon Serverless PostgreSQL.
 * Handles serverless compute cold starts (up to 30s) and PgBouncer transaction pooling.
 */
@Configuration
public class NeonDataSourceConfig {
    private static final Logger log = LoggerFactory.getLogger(NeonDataSourceConfig.class);

    @Value("${NEON_URL:${DATABASE_URL:}}")
    private String rawNeonUrl;

    @Bean
    @Primary
    @ConditionalOnProperty(name = "NEON_URL")
    public DataSource dataSource() {
        log.info("Configuring Neon Serverless Hikari DataSource with auto-suspend tolerance...");
        HikariConfig config = new HikariConfig();

        String jdbcUrl = formatToJdbcUrl(rawNeonUrl);
        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("org.postgresql.Driver");

        // Parse credentials if embedded in URI
        try {
            URI uri = new URI(rawNeonUrl.replace("jdbc:", ""));
            String userInfo = uri.getUserInfo();
            if (userInfo != null && userInfo.contains(":")) {
                String[] parts = userInfo.split(":", 2);
                config.setUsername(parts[0]);
                config.setPassword(parts[1]);
            }
        } catch (Exception e) {
            log.debug("Using credentials embedded directly in JDBC URL");
        }

        // HikariCP Neon Auto-Suspend Resiliency Settings
        config.setPoolName("AquaPulse-Neon-Pool");
        config.setMaximumPoolSize(8);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000);   // 30s cold-start grace
        config.setValidationTimeout(5000);    // 5s validation query limit
        config.setIdleTimeout(30000);          // 30s idle eviction
        config.setMaxLifetime(120000);        // 2m connection lifecycle
        config.setConnectionTestQuery("SELECT 1"); // Explicit probe
        config.setLeakDetectionThreshold(60000);

        // PgBouncer compatibility flags
        config.addDataSourceProperty("prepareThreshold", "0");
        config.addDataSourceProperty("sslmode", "require");
        config.addDataSourceProperty("reWriteBatchedInserts", "true");

        return new HikariDataSource(config);
    }

    public static String formatToJdbcUrl(String url) {
        if (url == null || url.isBlank()) return url;
        if (url.startsWith("jdbc:postgresql://")) return url;

        String clean = url;
        if (clean.startsWith("postgres://")) {
            clean = clean.substring("postgres://".length());
        } else if (clean.startsWith("postgresql://")) {
            clean = clean.substring("postgresql://".length());
        }

        // Ensure SSL and PgBouncer parameters
        String suffix = clean.contains("?") ? "&prepareThreshold=0" : "?sslmode=require&prepareThreshold=0";
        return "jdbc:postgresql://" + clean + (clean.contains("prepareThreshold") ? "" : suffix);
    }
}
