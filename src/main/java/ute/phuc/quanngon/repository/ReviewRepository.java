package ute.phuc.quanngon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.Review;

import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("""
        select count(r) as reviewCount,
               coalesce(avg(r.foodQuantity), 0.0) as foodQuantity,
               coalesce(avg(r.serviceQuantity), 0.0) as serviceQuantity,
               coalesce(avg(r.space), 0.0) as space,
               coalesce(avg(r.cleanliness), 0.0) as cleanliness
        from Review r
        where r.eatery.id = :eateryId
        """)
    EateryReviewSummary summarizeByEateryId(@Param("eateryId") Long eateryId);

    @Query("""
        select r from Review r join fetch r.sender s
        where r.eatery.id = :eateryId and s.account.email = :email
        """)
    Optional<Review> findCurrentUserReview(
            @Param("eateryId") Long eateryId,
            @Param("email") String email);

    @Query(value = """
        select r from Review r join fetch r.sender
        where r.eatery.id = :eateryId
          and (:viewerEmail is null or r.sender.account.email <> :viewerEmail)
        order by case when :sort = 'newest' then r.createdAt end desc,
          case when :sort = 'highest' then (r.foodQuantity + r.serviceQuantity + r.space + r.cleanliness) / 4.0 end desc,
          case when :sort = 'lowest' then (r.foodQuantity + r.serviceQuantity + r.space + r.cleanliness) / 4.0 end asc,
          r.reviewID desc
        """, countQuery = """
        select count(r) from Review r
        where r.eatery.id = :eateryId
          and (:viewerEmail is null or r.sender.account.email <> :viewerEmail)
        """)
    Page<Review> findReviews(
            @Param("eateryId") Long eateryId,
            @Param("viewerEmail") String viewerEmail,
            @Param("sort") String sort,
            Pageable pageable);
}
