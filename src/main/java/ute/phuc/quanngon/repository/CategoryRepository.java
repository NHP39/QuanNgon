package ute.phuc.quanngon.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ute.phuc.quanngon.dto.Response.AdminCategoryResponse;
import ute.phuc.quanngon.dto.Response.AdminCategorySummaryResponse;
import ute.phuc.quanngon.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    @Query(value =
    """
        select new ute.phuc.quanngon.dto.Response.AdminCategoryResponse(c.id, c.name, count(e))
        from Category c left join c.eateries e
        where (:keyword = '' or cast(function('category_name_key', c.name) as String)
            like concat(concat('%', cast(function('category_name_key', :keyword) as String)), '%'))
        group by c.id, c.name
    """, countQuery =
    """
        select count(c) from Category c
        where (:keyword = '' or cast(function('category_name_key', c.name) as String)
            like concat(concat('%', cast(function('category_name_key', :keyword) as String)), '%'))
    """)
    Page<AdminCategoryResponse> searchAdminCategories(@Param("keyword") String keyword, Pageable pageable);

    @Query(
    """
        select new ute.phuc.quanngon.dto.Response.AdminCategorySummaryResponse(count(distinct c.id), count(e))
        from Category c left join c.eateries e
    """)
    AdminCategorySummaryResponse getAdminSummary();

    @Query(
    """
        select (count(c) > 0) from Category c
        where cast(function('category_name_key', c.name) as String)
            = cast(function('category_name_key', :name) as String)
            and (:excludedId is null or c.id <> :excludedId)
    """)
    boolean existsByNormalizedNameExcludingId(@Param("name") String name, @Param("excludedId") Long excludedId);
}
