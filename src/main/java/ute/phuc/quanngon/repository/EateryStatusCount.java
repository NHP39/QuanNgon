package ute.phuc.quanngon.repository;

import ute.phuc.quanngon.enums.EateryStatus;

public interface EateryStatusCount {
    EateryStatus getStatus();
    Long getCounts();
}
