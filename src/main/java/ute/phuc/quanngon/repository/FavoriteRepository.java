package ute.phuc.quanngon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.entity.Favorite;

import java.util.List;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    @Modifying
    @Query(value = """
            insert into favorites (user_id, eatery_id)
            select :userId, e.id
            from eateries e
            where e.id = :eateryId and e.status = 'APPROVED'
            on conflict (user_id, eatery_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") Long userId, @Param("eateryId") Long eateryId);

    @Query("""
            select count(f) > 0
            from Favorite f
            where f.user.id = :userId and f.eatery.id = :eateryId
              and f.eatery.status = ute.phuc.quanngon.enums.EateryStatus.APPROVED
            """)
    boolean hasApprovedFavorite(@Param("userId") Long userId, @Param("eateryId") Long eateryId);

    @Modifying
    @Query("""
            delete from Favorite f
            where f.user.id = :userId and f.eatery.id = :eateryId
            """)
    int deleteFavorite(@Param("userId") Long userId, @Param("eateryId") Long eateryId);

    @Query(value = """
            select e.id as id, e.name as name, c.name as categoryName,
                   a.street as street, a.ward as ward, a.province as province,
                   min(i.url) as thumbnailUrl,
                   coalesce((avg(r.foodQuantity) + avg(r.serviceQuantity)
                             + avg(r.space) + avg(r.cleanliness)) / 4.0, 0.0) as averageRating,
                   count(distinct r.reviewID) as reviewCount
            from Favorite f
            join f.eatery e
            join e.category c
            join e.address a
            left join e.reviews r
            left join e.images i on i.type = ute.phuc.quanngon.enums.ImageType.THUMBNAIL
            where f.user.account.email = :email
              and e.status = ute.phuc.quanngon.enums.EateryStatus.APPROVED
            group by f.id, e.id, e.name, c.name, a.street, a.ward, a.province
            order by f.id desc
            """, countQuery = """
            select count(f)
            from Favorite f
            where f.user.account.email = :email
              and f.eatery.status = ute.phuc.quanngon.enums.EateryStatus.APPROVED
            """)
    Page<EateryCardProjection> findFavoriteCards(@Param("email") String email, Pageable pageable);

    @Query("""
            select f.eatery.id
            from Favorite f
            where f.user.account.email = :email and f.eatery.id in :eateryIds
            """)
    List<Long> findFavoriteEateryIds(@Param("email") String email, @Param("eateryIds") List<Long> eateryIds);
}
