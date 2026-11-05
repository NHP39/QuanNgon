package ute.phuc.quanngon.repository;

public interface EateryCardProjection {
    Long getId();
    String getName();
    String getCategoryName();
    String getStreet();
    String getWard();
    String getProvince();
    String getThumbnailUrl();
    Double getAverageRating();
    Long getReviewCount();
}
