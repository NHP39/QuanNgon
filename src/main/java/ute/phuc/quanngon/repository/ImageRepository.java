package ute.phuc.quanngon.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.Image;

import java.util.List;

@Repository
public interface ImageRepository extends JpaRepository<Image, Long> {

    @Query("""
        select i.eatery.id as eateryId, i.id as id,
               i.url as imageUrl, i.type as type
        from Image i
        where i.eatery.id in :eateryIds
        order by i.eatery.id,
                 case when i.type = ute.phuc.quanngon.enums.ImageType.THUMBNAIL
                      then 0 else 1 end,
                 i.id
        """)
    List<EateryImageProjection> findEateryImages(@Param("eateryIds") List<Long> eateryIds);

    @Query("""
        select i.review.reviewID as reviewId, i.id as id, i.url as imageUrl
        from Image i
        where i.review.reviewID in :reviewIds
        order by i.id
        """)
    List<ReviewImageProjection> findReviewImages(@Param("reviewIds") List<Long> reviewIds);
}
