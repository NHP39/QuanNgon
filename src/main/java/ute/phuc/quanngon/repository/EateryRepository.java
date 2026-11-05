package ute.phuc.quanngon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.Eatery;
import ute.phuc.quanngon.enums.EateryStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface EateryRepository extends JpaRepository<Eatery, Long> {

    boolean existsByIdAndStatus(Long id, EateryStatus status);

    boolean existsByCategory_Id(Long categoryId);

    long countByCategory_Id(Long categoryId);

    @Query("""
        select distinct e
        from Eatery e
        join fetch e.category
        join fetch e.address
        left join fetch e.images
        where e.id = :eateryId
          and e.status = ute.phuc.quanngon.enums.EateryStatus.APPROVED
        """)
    Optional<Eatery> findPublicEateryDetail(@Param("eateryId") Long eateryId);

    @Query("""
        select distinct trim(a.province) as province
        from Eatery e
        join e.address a
        where e.status = ute.phuc.quanngon.enums.EateryStatus.APPROVED
        order by province
        """)
    List<String> findDistinctApprovedEateryProvinces();

    // User: search, filter and rank eatery cards.
    @Query(value = """
        select e.id as id, e.name as name, c.name as categoryName,
               a.street as street, a.ward as ward, a.province as province,
               min(i.url) as thumbnailUrl,
               coalesce((avg(r.foodQuantity) + avg(r.serviceQuantity)
                       + avg(r.space) + avg(r.cleanliness)) / 4.0, 0.0) as averageRating,
               count(distinct r.reviewID) as reviewCount
        from Eatery e join e.category c join e.address a
        left join e.reviews r
        left join e.images i on i.type = ute.phuc.quanngon.enums.ImageType.THUMBNAIL
        where e.status = :status
          and (:categoryId is null or c.id = :categoryId)
          and (:province = '' or trim(a.province) = :province)
          and (:keyword = ''
               or lower(cast(function('unaccent', e.name) as String))
                  like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%')
               or lower(cast(function('unaccent', e.content) as String))
                  like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%'))
          and (:onlyWithReviews = false or e.reviews is not empty)
        group by e.id, e.name, c.name, a.street, a.ward, a.province, e.createdAt
        """, countQuery = """
        select count(e) from Eatery e
        where e.status = :status
          and (:categoryId is null or e.category.id = :categoryId)
          and (:province = '' or trim(e.address.province) = :province)
          and (:keyword = ''
               or lower(cast(function('unaccent', e.name) as String))
                  like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%')
               or lower(cast(function('unaccent', e.content) as String))
                  like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%'))
          and (:onlyWithReviews = false or e.reviews is not empty)
        """)
    Page<EateryCardProjection> searchPublicEateryCards(
            @Param("status") EateryStatus status,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("province") String province,
            @Param("onlyWithReviews") boolean onlyWithReviews,
            Pageable pageable);

    // Admin: lấy quán cùng các quan hệ một bản ghi để phân trang.
    @Query(value = """
        select e 
        from Eatery e
        join fetch e.category
        join fetch e.address
        join fetch e.owner o
        join fetch o.account
        where e.status = :status
            and (:categoryId is null or e.category.id = :categoryId)
            and (:keyword = ''
                or lower(cast(function('unaccent', e.name) as String))
                   like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%')
                or lower(cast(function('unaccent', e.content) as String))
                   like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%'))
        """,
        countQuery = """
        select count(e)
        from Eatery e
        where e.status = :status
            and (:categoryId is null or e.category.id = :categoryId)
            and (:keyword = ''
                or lower(cast(function('unaccent', e.name) as String))
                   like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%')
                or lower(cast(function('unaccent', e.content) as String))
                   like concat('%', lower(cast(function('unaccent', :keyword) as String)), '%'))
        """)
    Page<Eatery> searchEateries(
            @Param("status") EateryStatus status,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            Pageable pageable);

    @Query(value = """
        select e
        from Eatery e
        join fetch e.category
        join fetch e.address
        where e.owner.account.email = :ownerEmail
          and (:status is null or e.status = :status)
        """,
        countQuery = """
        select count(e)
        from Eatery e
        where e.owner.account.email = :ownerEmail
          and (:status is null or e.status = :status)
        """)
    Page<Eatery> findMyEateries(
            @Param("ownerEmail") String ownerEmail,
            @Param("status") EateryStatus status,
            Pageable pageable);

    @Query("""
        select e
        from Eatery e
        join fetch e.category
        join fetch e.address
        where e.id = :eateryId
          and e.owner.account.email = :ownerEmail
        """)
    Optional<Eatery> findMyEateryDetail(
            @Param("eateryId") Long eateryId,
            @Param("ownerEmail") String ownerEmail);

    //Admin
    @Query(
    """
        select e.status as status, count(e) as counts
        from Eatery e
        group by e.status
    """
    )
    List<EateryStatusCount> countEateriesByStatus();

    @Query(value = """
            select cast(e.created_at at time zone :timeZone as date)
                       as "postDate",
                   count(*) as "postCount"
            from eateries e
            where e.created_at >= :startTime
              and e.created_at < :endTimeExclusive
            group by "postDate"
            order by "postDate"
            """, nativeQuery = true)
    List<DailyPostCount> countPostsByDate(
            @Param("startTime") Instant startTime,
            @Param("endTimeExclusive") Instant endTimeExclusive,
            @Param("timeZone") String timeZone);
}
