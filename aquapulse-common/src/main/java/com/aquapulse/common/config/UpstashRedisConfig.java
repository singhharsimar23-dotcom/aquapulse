package com.aquapulse.common.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import io.lettuce.core.resource.ClientResources;
import io.lettuce.core.resource.DefaultClientResources;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettucePoolingClientConfiguration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.net.URI;
import java.time.Duration;

/**
 * High-performance Lettuce Redis connection factory supporting Upstash rediss:// TLS
 * and Apache Commons Pool2 connection pooling.
 */
@Configuration
public class UpstashRedisConfig {
    private static final Logger log = LoggerFactory.getLogger(UpstashRedisConfig.class);

    @Value("${REDIS_URL:redis://localhost:6379}")
    private String redisUrl;

    @Bean(destroyMethod = "shutdown")
    public ClientResources clientResources() {
        return DefaultClientResources.create();
    }

    @Bean
    @Primary
    public LettuceConnectionFactory redisConnectionFactory(ClientResources clientResources) {
        log.info("Initializing Upstash Redis connection factory with TLS/Pooling...");
        URI uri = URI.create(redisUrl);
        boolean isSsl = "rediss".equalsIgnoreCase(uri.getScheme());

        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration();
        redisConfig.setHostName(uri.getHost() != null ? uri.getHost() : "localhost");
        redisConfig.setPort(uri.getPort() == -1 ? 6379 : uri.getPort());

        if (uri.getUserInfo() != null) {
            String[] userInfo = uri.getUserInfo().split(":", 2);
            if (userInfo.length > 1) {
                redisConfig.setUsername(userInfo[0].isEmpty() ? "default" : userInfo[0]);
                redisConfig.setPassword(userInfo[1]);
            } else {
                redisConfig.setPassword(userInfo[0]);
            }
        }

        SocketOptions socketOptions = SocketOptions.builder()
                .connectTimeout(Duration.ofMillis(5000))
                .keepAlive(true)
                .build();

        ClientOptions clientOptions = ClientOptions.builder()
                .socketOptions(socketOptions)
                .autoReconnect(true)
                .disconnectedBehavior(ClientOptions.DisconnectedBehavior.REJECT_COMMANDS)
                .build();

        GenericObjectPoolConfig<?> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(8);
        poolConfig.setMaxIdle(4);
        poolConfig.setMinIdle(1);
        poolConfig.setMaxWait(Duration.ofMillis(2000));

        LettucePoolingClientConfiguration.LettucePoolingClientConfigurationBuilder builder =
                LettucePoolingClientConfiguration.builder()
                        .poolConfig(poolConfig)
                        .clientOptions(clientOptions)
                        .clientResources(clientResources)
                        .commandTimeout(Duration.ofMillis(3000));

        if (isSsl) {
            builder.useSsl().disablePeerVerification(); // Upstash public CA
        }

        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisConfig, builder.build());
        factory.setValidateConnection(true);
        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        return template;
    }
}
