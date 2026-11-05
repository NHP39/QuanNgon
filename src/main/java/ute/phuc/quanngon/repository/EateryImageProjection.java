package ute.phuc.quanngon.repository;

import ute.phuc.quanngon.enums.ImageType;

public interface EateryImageProjection {
    Long getEateryId();
    Long getId();
    String getImageUrl();
    ImageType getType();
}
