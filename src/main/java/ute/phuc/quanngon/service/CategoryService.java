package ute.phuc.quanngon.service;

import ute.phuc.quanngon.dto.Request.CategoryNameRequest;
import ute.phuc.quanngon.dto.Response.AdminCategoryPageResponse;
import ute.phuc.quanngon.dto.Response.AdminCategoryResponse;
import ute.phuc.quanngon.dto.Response.CategoryResponse;

import java.util.List;

public interface CategoryService {
    List<CategoryResponse> getAllCategories();
    AdminCategoryPageResponse<AdminCategoryResponse> getAdminCategories(String q, int page, int size);
    AdminCategoryResponse createCategory(CategoryNameRequest request);
    AdminCategoryResponse updateCategory(Long categoryId, CategoryNameRequest request);
    void deleteCategory(Long categoryId);
}
