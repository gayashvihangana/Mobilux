package com.mobilux.dto;

import com.mobilux.model.ProductCategory;
import java.math.BigDecimal;

public class ProductResponse {
    private Long id;
    private String name;
    private BigDecimal price;
    private ProductCategory category;
    private boolean visible;

    public ProductResponse(Long id, String name, BigDecimal price, ProductCategory category, boolean visible) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.category = category;
        this.visible = visible;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public ProductCategory getCategory() {
        return category;
    }

    public boolean isVisible() {
        return visible;
    }
}
