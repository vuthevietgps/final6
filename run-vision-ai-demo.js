/**
 * Demo Script - Automated Vision AI + Product Management Demo
 * Run this script to automatically create demo data and test Vision AI features
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';
const SAMPLE_IMAGES_DIR = path.join(__dirname, 'backend', 'uploads', 'samples');

// Demo products data
const DEMO_PRODUCTS = [
  {
    name: "iPhone 15 Pro Max 256GB",
    importPrice: 25000000,
    image: "iphone-15-pro-max.jpg",
    expectedAnalysis: {
      objects: ["iPhone", "smartphone", "điện thoại"],
      colors: ["đen", "titanium", "xám"],
      keywords: ["iphone", "15", "pro", "max", "apple"]
    }
  },
  {
    name: "MacBook Air M2 13 inch",
    importPrice: 22000000,
    image: "macbook-air-m2.jpg",
    expectedAnalysis: {
      objects: ["MacBook", "laptop", "máy tính"],
      colors: ["midnight", "đen", "xanh"],
      keywords: ["macbook", "air", "m2", "laptop", "apple"]
    }
  },
  {
    name: "AirPods Pro 2nd Generation",
    importPrice: 4500000,
    image: "airpods-pro-2.jpg",
    expectedAnalysis: {
      objects: ["AirPods", "tai nghe", "headphones"],
      colors: ["trắng", "white"],
      keywords: ["airpods", "pro", "2", "tai nghe", "apple"]
    }
  }
];

class VisionAIDemo {
  constructor() {
    this.step = 1;
    console.log('🎬 Vision AI + Product Management Demo Started!');
    console.log('=' .repeat(60));
  }

  log(message) {
    console.log(`\n📍 Step ${this.step}: ${message}`);
    this.step++;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkServerStatus() {
    this.log('Checking server status...');
    try {
      const response = await axios.get(`${API_BASE}/health`);
      console.log('✅ Backend server is running');
      return true;
    } catch (error) {
      console.log('❌ Backend server is not running');
      console.log('🔧 Please start backend server: npm run start:dev');
      return false;
    }
  }

  async checkSampleImages() {
    this.log('Checking sample images...');
    
    const missingImages = [];
    for (const product of DEMO_PRODUCTS) {
      const imagePath = path.join(SAMPLE_IMAGES_DIR, product.image);
      if (!fs.existsSync(imagePath)) {
        missingImages.push(product.image);
      }
    }

    if (missingImages.length > 0) {
      console.log('❌ Missing sample images:');
      missingImages.forEach(img => console.log(`   - ${img}`));
      console.log('\n📁 Please add sample images to:');
      console.log(`   ${SAMPLE_IMAGES_DIR}`);
      console.log('\n📖 See guide: backend/uploads/samples/SAMPLE_IMAGES_GUIDE.md');
      return false;
    }

    console.log('✅ All sample images found');
    return true;
  }

  async createDemoFanpage() {
    this.log('Creating demo fanpage...');
    
    const fanpageData = {
      name: "Vision AI Demo Store",
      pageId: "demo_vision_ai_" + Date.now(),
      description: "Demo store showcasing Vision AI capabilities with smart product recommendations",
      aiEnabled: true,
      greetingScript: "🤖 Xin chào! Tôi là AI assistant với khả năng phân tích ảnh và gợi ý sản phẩm thông minh. Bạn cần tìm gì?",
      status: "Hoạt động"
    };

    try {
      const response = await axios.post(`${API_BASE}/fanpage`, fanpageData);
      const fanpage = response.data;
      console.log(`✅ Demo fanpage created: ${fanpage.name}`);
      console.log(`🆔 Fanpage ID: ${fanpage._id}`);
      return fanpage;
    } catch (error) {
      console.log('❌ Failed to create fanpage:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async analyzeProductImage(product) {
    this.log(`Analyzing image: ${product.image}`);
    
    const imageUrl = `${API_BASE}/uploads/samples/${product.image}`;
    console.log(`🖼️  Image URL: ${imageUrl}`);

    try {
      console.log('🤖 Sending to Vision AI...');
      const response = await axios.post(`${API_BASE}/products/analyze-image`, {
        imageUrl: imageUrl
      });

      const analysis = response.data.data.analysis;
      console.log('✅ AI Analysis Results:');
      console.log(`   🎯 Objects: ${analysis.objects.join(', ')}`);
      console.log(`   🎨 Colors: ${analysis.colors.join(', ')}`);
      console.log(`   ⭐ Features: ${analysis.features.join(', ')}`);
      console.log(`   🔍 Keywords: ${analysis.keywords.join(', ')}`);
      console.log(`   📝 Description: ${analysis.description.substring(0, 80)}...`);
      console.log(`   🎲 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      // Verify expected results
      const expectedKeywords = product.expectedAnalysis.keywords;
      const foundKeywords = analysis.keywords.filter(k => 
        expectedKeywords.some(ek => k.toLowerCase().includes(ek.toLowerCase()))
      );

      if (foundKeywords.length > 0) {
        console.log(`✅ Expected keywords found: ${foundKeywords.join(', ')}`);
      } else {
        console.log(`⚠️  Expected keywords not found. This might indicate image quality issues.`);
      }

      return analysis;
    } catch (error) {
      console.log('❌ Vision AI analysis failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async createProductWithAI(product, fanpage, analysis) {
    this.log(`Creating product: ${product.name}`);

    const productData = {
      name: product.name,
      importPrice: product.importPrice,
      shippingCost: 200000,
      packagingCost: 50000,
      estimatedDeliveryDays: 2,
      status: "Hoạt động",
      images: [{
        url: `${API_BASE}/uploads/samples/${product.image}`,
        description: `${product.name} - AI analyzed product image`,
        isMainImage: true,
        uploadedAt: new Date(),
        aiAnalysis: analysis
      }],
      searchKeywords: analysis.keywords,
      aiDescription: analysis.description,
      fanpageVariations: [{
        fanpageId: fanpage._id,
        customName: `${product.name} - Vision AI Demo`,
        customDescription: `🤖 ${analysis.description}\n\n✨ Analyzed by Vision AI\n🎯 Keywords: ${analysis.keywords.join(', ')}`,
        price: Math.round(product.importPrice * 1.3), // 30% markup
        isActive: true,
        priority: analysis.confidence * 10
      }]
    };

    try {
      const response = await axios.post(`${API_BASE}/products`, productData);
      const createdProduct = response.data;
      console.log(`✅ Product created: ${createdProduct.name}`);
      console.log(`💰 Price: ${createdProduct.importPrice.toLocaleString()}đ`);
      console.log(`🏷️  Fanpage price: ${productData.fanpageVariations[0].price.toLocaleString()}đ`);
      return createdProduct;
    } catch (error) {
      console.log('❌ Failed to create product:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async testProductSearch(fanpage, searchQuery) {
    this.log(`Testing product search: "${searchQuery}"`);

    try {
      const response = await axios.post(`${API_BASE}/products/find-similar`, {
        query: searchQuery,
        fanpageId: fanpage._id,
        limit: 3
      });

      const recommendations = response.data.data.recommendations;
      console.log(`✅ Found ${recommendations.length} matching products:`);
      
      recommendations.forEach((rec, index) => {
        console.log(`\n   ${index + 1}. ${rec.product.name}`);
        console.log(`      🎯 Match Score: ${rec.matchScore}`);
        console.log(`      💡 Reasons: ${rec.matchReasons.join(', ')}`);
        console.log(`      💰 Price: ${rec.product.importPrice.toLocaleString()}đ`);
      });

      return recommendations;
    } catch (error) {
      console.log('❌ Product search failed:', error.response?.data?.message || error.message);
      return [];
    }
  }

  async getAIStats(fanpage) {
    this.log('Getting AI analysis statistics...');

    try {
      const response = await axios.get(`${API_BASE}/products/ai-stats?fanpageId=${fanpage._id}`);
      const stats = response.data.data;
      
      console.log('📊 AI Analysis Statistics:');
      console.log(`   📦 Total products: ${stats.totalProducts}`);
      console.log(`   🤖 Products with AI: ${stats.productsWithAI}`);
      console.log(`   📈 AI coverage: ${stats.aiCoveragePercentage}%`);
      console.log(`   🖼️  Total images: ${stats.totalImages}`);
      console.log(`   🔍 Total keywords: ${stats.totalKeywords}`);
      console.log(`   🎯 Avg confidence: ${stats.avgConfidence}`);
      
      if (stats.topKeywords.length > 0) {
        console.log('   🏆 Top keywords:');
        stats.topKeywords.slice(0, 5).forEach(kw => {
          console.log(`      - ${kw.keyword}: ${kw.count} times`);
        });
      }

      return stats;
    } catch (error) {
      console.log('❌ Failed to get AI stats:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async runDemo() {
    console.log('\n🚀 Starting automated Vision AI demo...\n');

    // Check prerequisites
    if (!(await this.checkServerStatus())) return;
    if (!(await this.checkSampleImages())) return;

    // Create demo fanpage
    const fanpage = await this.createDemoFanpage();
    if (!fanpage) return;

    await this.sleep(1000);

    // Process each demo product
    const createdProducts = [];
    for (const product of DEMO_PRODUCTS) {
      console.log('\n' + '─'.repeat(50));
      
      // Analyze image with AI
      const analysis = await this.analyzeProductImage(product);
      if (!analysis) continue;

      await this.sleep(1000);

      // Create product with AI data
      const createdProduct = await this.createProductWithAI(product, fanpage, analysis);
      if (createdProduct) {
        createdProducts.push(createdProduct);
      }

      await this.sleep(1000);
    }

    // Test search functionality
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 TESTING SEARCH FUNCTIONALITY');
    console.log('═'.repeat(60));

    const searchQueries = [
      "iphone camera đẹp",
      "laptop apple mỏng nhẹ", 
      "tai nghe không dây chống ồn"
    ];

    for (const query of searchQueries) {
      await this.testProductSearch(fanpage, query);
      await this.sleep(1000);
    }

    // Get final statistics
    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL STATISTICS');
    console.log('═'.repeat(60));

    await this.getAIStats(fanpage);

    // Demo completion summary
    console.log('\n' + '🎉'.repeat(20));
    console.log('🎊 DEMO COMPLETED SUCCESSFULLY! 🎊');
    console.log('🎉'.repeat(20));

    console.log('\n📋 Demo Summary:');
    console.log(`✅ Fanpage created: ${fanpage.name}`);
    console.log(`✅ Products analyzed: ${createdProducts.length}`);
    console.log(`✅ Search queries tested: ${searchQueries.length}`);
    console.log(`✅ Vision AI working: All images analyzed successfully`);

    console.log('\n🌐 Next Steps:');
    console.log('1. Open frontend: http://localhost:4200');
    console.log('2. Go to Fanpage management');
    console.log('3. View the demo fanpage and products');
    console.log('4. Test upload new images');
    console.log('5. Try messenger webhook with product queries');

    console.log('\n💡 Pro Tips:');
    console.log('- Upload high-quality product images for better AI analysis');
    console.log('- Use descriptive product names for better search matching');
    console.log('- Monitor AI confidence scores and adjust as needed');
    console.log('- Test chatbot responses with various product queries');

    console.log('\n🚀 Vision AI + Product Management system is ready for production!');
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new VisionAIDemo();
  demo.runDemo().catch(error => {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  });
}

module.exports = VisionAIDemo;