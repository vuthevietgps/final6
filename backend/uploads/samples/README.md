# Sample Images Placeholder

This directory contains sample product images for Vision AI testing.

## Required Images:
1. iphone-15-pro-max.jpg - iPhone 15 Pro Max product image
2. macbook-air-m2.jpg - MacBook Air M2 laptop image  
3. airpods-pro-2.jpg - AirPods Pro 2nd generation image
4. galaxy-s24-ultra.jpg - Samsung Galaxy S24 Ultra image
5. iphone-case-15pro.jpg - iPhone 15 Pro Max case image

## Image Requirements:
- Format: JPG, PNG, or WebP
- Max size: 2MB
- Recommended resolution: 800x800px
- Clear product visibility for AI analysis

## Usage:
These images will be used by the Vision AI service to:
- Analyze product features and colors
- Extract keywords for search optimization
- Generate product descriptions
- Test smart product matching in chatbot

## Testing:
After placing images here, test with:
- POST /products/analyze-image
- POST /products/find-similar
- Messenger webhook smart product recommendations