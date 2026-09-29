package com.aquapulse.common.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NeonDataSourceConfigTest {

    @Test
    @DisplayName("formatToJdbcUrl translates postgres:// URL to JDBC URL with prepareThreshold=0")
    void testFormatToJdbcUrl() {
        String neonUrl = "postgres://aquapulse_user:secret@ep-quiet-waterfall-123456-pooler.us-east-2.aws.neon.tech/aquapulse?sslmode=require";
        String jdbcUrl = NeonDataSourceConfig.formatToJdbcUrl(neonUrl);

        assertThat(jdbcUrl).startsWith("jdbc:postgresql://");
        assertThat(jdbcUrl).contains("prepareThreshold=0");
        assertThat(jdbcUrl).contains("sslmode=require");
    }

    @Test
    @DisplayName("formatToJdbcUrl handles postgresql:// prefix")
    void testFormatPostgresqlPrefix() {
        String raw = "postgresql://localhost:5432/aquapulse";
        String jdbcUrl = NeonDataSourceConfig.formatToJdbcUrl(raw);

        assertThat(jdbcUrl).startsWith("jdbc:postgresql://localhost:5432/aquapulse");
        assertThat(jdbcUrl).contains("prepareThreshold=0");
    }

    @Test
    @DisplayName("formatToJdbcUrl preserves existing jdbc:postgresql:// prefix")
    void testAlreadyJdbcUrl() {
        String raw = "jdbc:postgresql://localhost:5432/aquapulse?prepareThreshold=0";
        String jdbcUrl = NeonDataSourceConfig.formatToJdbcUrl(raw);

        assertThat(jdbcUrl).isEqualTo(raw);
    }
}
