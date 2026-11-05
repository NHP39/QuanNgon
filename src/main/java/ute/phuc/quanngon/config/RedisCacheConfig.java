package ute.phuc.quanngon.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.LoggingCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.BatchStrategies;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;
import ute.phuc.quanngon.dto.Response.CategoryResponse;
import ute.phuc.quanngon.dto.Response.EateryCardResponse;
import ute.phuc.quanngon.dto.Response.EateryStatusStatisticsResponse;
import ute.phuc.quanngon.dto.Response.PageResponse;
import ute.phuc.quanngon.dto.Response.PostStatisticsResponse;
import ute.phuc.quanngon.dto.Response.UserRegistrationStatisticsResponse;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisCacheConfig implements CachingConfigurer {

    public static final String CATEGORIES = "categories";
    public static final String DASHBOARD_USERS = "dashboard-users";
    public static final String DASHBOARD_EATERY_STATUSES = "dashboard-eatery-statuses";
    public static final String DASHBOARD_POSTS = "dashboard-posts";
    public static final String FEATURED_EATERIES = "featured-eateries";

    @Value("${app.cache.categories-ttl-seconds:1800}")
    private long categoriesTtlSeconds;

    @Value("${app.cache.dashboard-ttl-seconds:60}")
    private long dashboardTtlSeconds;

    @Value("${app.cache.featured-eateries-ttl-seconds:300}")
    private long featuredEateriesTtlSeconds;

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Tách khóa cache khỏi dữ liệu OTP.
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .prefixCacheNameWith("quanngon:cache:v2:")
                .disableCachingNullValues();

        // Xác định kiểu dữ liệu JSON cho từng nhóm cache.
        JsonMapper mapper = JsonMapper.builder().build();
        var types = mapper.getTypeFactory();
        Map<String, RedisCacheConfiguration> configurations = Map.of(
                CATEGORIES, cacheConfig(defaults, mapper,
                        types.constructCollectionType(List.class, CategoryResponse.class), categoriesTtlSeconds),
                DASHBOARD_USERS, cacheConfig(defaults, mapper,
                        types.constructType(UserRegistrationStatisticsResponse.class), dashboardTtlSeconds),
                DASHBOARD_EATERY_STATUSES, cacheConfig(defaults, mapper,
                        types.constructType(EateryStatusStatisticsResponse.class), dashboardTtlSeconds),
                DASHBOARD_POSTS, cacheConfig(defaults, mapper,
                        types.constructType(PostStatisticsResponse.class), dashboardTtlSeconds),
                FEATURED_EATERIES, cacheConfig(defaults, mapper,
                        types.constructParametricType(PageResponse.class, EateryCardResponse.class),
                        featuredEateriesTtlSeconds)
        );

        // Ghi đồng bộ để handler bắt được lỗi; dùng SCAN khi xóa nhóm cache.
        RedisCacheWriter writer = RedisCacheWriter.create(connectionFactory,
                config -> config.immediateWrites().batchStrategy(BatchStrategies.scan(100)));

        return RedisCacheManager.builder(writer)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(configurations)
                .disableCreateOnMissingCache()
                .build();
    }

    private RedisCacheConfiguration cacheConfig(
            RedisCacheConfiguration defaults, JsonMapper mapper, JavaType type, long ttlSeconds) {
        if (ttlSeconds <= 0) {
            throw new IllegalArgumentException("TTL cache phải lớn hơn 0 giây");
        }
        JacksonJsonRedisSerializer<Object> serializer = new JacksonJsonRedisSerializer<>(mapper, type);
        return defaults.entryTtl(Duration.ofSeconds(ttlSeconds))
                .serializeValuesWith(SerializationPair.fromSerializer(serializer));
    }

    @Bean
    @Override
    public CacheErrorHandler errorHandler() {
        // Ghi log và bỏ qua lỗi cache để method tiếp tục lấy dữ liệu từ DB.
        return new LoggingCacheErrorHandler(true);
    }
}
