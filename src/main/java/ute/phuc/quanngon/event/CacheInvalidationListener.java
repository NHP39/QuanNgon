package ute.phuc.quanngon.event;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import static ute.phuc.quanngon.config.RedisCacheConfig.*;

@Component
public class CacheInvalidationListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Caching(evict = {
            @CacheEvict(cacheNames = CATEGORIES, allEntries = true,
                    condition = "#p0.cacheNames().contains('categories')"),
            @CacheEvict(cacheNames = DASHBOARD_USERS, allEntries = true,
                    condition = "#p0.cacheNames().contains('dashboard-users')"),
            @CacheEvict(cacheNames = DASHBOARD_EATERY_STATUSES, allEntries = true,
                    condition = "#p0.cacheNames().contains('dashboard-eatery-statuses')"),
            @CacheEvict(cacheNames = DASHBOARD_POSTS, allEntries = true,
                    condition = "#p0.cacheNames().contains('dashboard-posts')"),
            @CacheEvict(cacheNames = FEATURED_EATERIES, allEntries = true,
                    condition = "#p0.cacheNames().contains('featured-eateries')")
    })
    public void invalidate(CacheInvalidationEvent event) {
        // Spring xóa các nhóm cache được chỉ định sau khi transaction commit.
    }
}
