package ute.phuc.quanngon.event;

import java.util.Set;

public record CacheInvalidationEvent(Set<String> cacheNames) {
    public CacheInvalidationEvent {
        cacheNames = Set.copyOf(cacheNames);
    }
}
