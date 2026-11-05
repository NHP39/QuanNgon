package ute.phuc.quanngon.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ute.phuc.quanngon.dto.Request.CategoryNameRequest;
import ute.phuc.quanngon.dto.Response.AdminCategoryPageResponse;
import ute.phuc.quanngon.dto.Response.AdminCategoryResponse;
import ute.phuc.quanngon.dto.Response.CategoryResponse;
import ute.phuc.quanngon.entity.Category;
import ute.phuc.quanngon.event.CacheInvalidationEvent;
import ute.phuc.quanngon.exception.CategoryConflictException;
import ute.phuc.quanngon.exception.InvalidCategoryException;
import ute.phuc.quanngon.exception.ResourceNotFoundException;
import ute.phuc.quanngon.repository.CategoryRepository;
import ute.phuc.quanngon.repository.EateryRepository;
import ute.phuc.quanngon.service.CategoryService;

import java.util.List;
import java.util.Set;

import static ute.phuc.quanngon.config.RedisCacheConfig.CATEGORIES;
import static ute.phuc.quanngon.config.RedisCacheConfig.FEATURED_EATERIES;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final EateryRepository eateryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Cacheable(cacheNames = CATEGORIES, key = "'all'")
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(category -> new CategoryResponse(
                        category.getId(),
                        category.getName()
                ))
                .toList();
    }

    @Override
    public AdminCategoryPageResponse<AdminCategoryResponse> getAdminCategories(String q, int page, int size) {
        String keyword = q == null ? "" : q.strip();
        Page<AdminCategoryResponse> categories = categoryRepository.searchAdminCategories(
                keyword, PageRequest.of(page, size, Sort.by("id").descending()));
        return new AdminCategoryPageResponse<>(categories.getContent(), categories.getNumber(), categories.getSize(),
                categories.getTotalElements(), categories.getTotalPages(), categoryRepository.getAdminSummary());
    }

    @Override
    @Transactional
    public AdminCategoryResponse createCategory(CategoryNameRequest request) {
        // Chuẩn hóa tên và kiểm tra trùng trước khi lưu.
        String name = normalizeName(request.name());
        checkDuplicateName(name, null);
        Category category = Category.builder().name(name).build();
        Category savedCategory = categoryRepository.save(category);

        // Xóa cache danh mục sau khi commit thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(CATEGORIES)));
        return new AdminCategoryResponse(savedCategory.getId(), savedCategory.getName(), 0L);
    }

    @Override
    @Transactional
    public AdminCategoryResponse updateCategory(Long categoryId, CategoryNameRequest request) {
        // Tìm danh mục và kiểm tra tên mới, loại trừ chính danh mục đang sửa.
        Category category = findCategory(categoryId);
        String name = normalizeName(request.name());
        checkDuplicateName(name, categoryId);
        category.setName(name);
        Category savedCategory = categoryRepository.save(category);

        // Xóa danh mục và top 3 sau khi đổi tên thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(CATEGORIES, FEATURED_EATERIES)));
        return new AdminCategoryResponse(savedCategory.getId(), savedCategory.getName(),
                eateryRepository.countByCategory_Id(categoryId));
    }

    @Override
    @Transactional
    public void deleteCategory(Long categoryId) {
        // Kiểm tra tồn tại và mọi trạng thái quán trước khi xóa.
        Category category = findCategory(categoryId);
        if (eateryRepository.existsByCategory_Id(categoryId)) {
            throw new CategoryConflictException("Không thể xóa danh mục đang có quán ăn");
        }
        categoryRepository.delete(category);

        // Xóa cache danh mục sau khi commit thành công.
        eventPublisher.publishEvent(new CacheInvalidationEvent(Set.of(CATEGORIES)));
    }

    private Category findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
    }

    private String normalizeName(String name) {
        String normalizedName = name == null ? "" : name.replaceAll("(?U)\\s+", " ").strip();
        if (normalizedName.length() < 2 || normalizedName.length() > 80) {
            throw new InvalidCategoryException("Tên danh mục phải từ 2 đến 80 ký tự sau khi chuẩn hóa");
        }
        return normalizedName;
    }

    private void checkDuplicateName(String name, Long excludedId) {
        if (categoryRepository.existsByNormalizedNameExcludingId(name, excludedId)) {
            throw new CategoryConflictException("Tên danh mục đã tồn tại");
        }
    }

}
