/**
 * 📸 Sample Data Preparation Script for Vision AI Testing
 * 
 * This script helps prepare and organize sample images for testing
 * the Vision AI + Product Management system. It includes:
 * - Sample image download/preparation instructions
 * - Image validation and optimization
 * - Database seeding with sample products
 * - Test data generation for comprehensive testing
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  sampleImagesPath: path.join(__dirname, 'backend/uploads/samples'),
  backendUrl: 'http://localhost:3000',
  testDataPath: path.join(__dirname, 'test-data.json')
};

/**
 * 📋 Sample Images List with metadata
 */
const SAMPLE_IMAGES = [
  {
    filename: 'iphone-15-pro-max.jpg',
    productName: 'iPhone 15 Pro Max 256GB',
    category: 'Điện tử',
    basePrice: 25000000,
    expectedKeywords: ['iphone', '15', 'pro', 'max', 'apple', 'smartphone'],
    description: 'iPhone 15 Pro Max màu Titanium Tự Nhiên với camera Pro 48MP',
    downloadUrl: 'https://example.com/sample-iphone.jpg' // Replace with actual URL
  },
  {
    filename: 'macbook-air-m2.jpg',
    productName: 'MacBook Air M2 13inch 256GB',
    category: 'Điện tử',
    basePrice: 28000000,
    expectedKeywords: ['macbook', 'air', 'm2', 'apple', 'laptop'],
    description: 'MacBook Air M2 13 inch màu Midnight với chip Apple M2',
    downloadUrl: 'https://example.com/sample-macbook.jpg'
  },
  {
    filename: 'airpods-pro-2.jpg',
    productName: 'AirPods Pro 2nd Generation',
    category: 'Điện tử',
    basePrice: 6500000,
    expectedKeywords: ['airpods', 'pro', '2nd', 'apple', 'headphones', 'wireless'],
    description: 'AirPods Pro thế hệ thứ 2 với chip H2 và khử tiếng ồn',
    downloadUrl: 'https://example.com/sample-airpods.jpg'
  },
  {
    filename: 'galaxy-s24-ultra.jpg',
    productName: 'Samsung Galaxy S24 Ultra 256GB',
    category: 'Điện tử',
    basePrice: 30000000,
    expectedKeywords: ['samsung', 'galaxy', 's24', 'ultra', 'android'],
    description: 'Samsung Galaxy S24 Ultra với S-Pen và camera 200MP',
    downloadUrl: 'https://example.com/sample-samsung.jpg'
  },
  {
    filename: 'iphone-case-15pro.jpg',
    productName: 'Ốp lưng iPhone 15 Pro Max Silicone',
    category: 'Phụ kiện',
    basePrice: 890000,
    expectedKeywords: ['ốp lưng', 'case', 'iphone', '15', 'pro', 'silicone'],
    description: 'Ốp lưng Silicon chính hãng Apple cho iPhone 15 Pro Max',
    downloadUrl: 'https://example.com/sample-case.jpg'
  }
];

/**
 * 🎯 Sample Fanpages for testing
 */
const SAMPLE_FANPAGES = [
  {
    name: 'Vision AI Tech Store',
    pageId: 'vision_ai_tech_001',
    description: 'Cửa hàng công nghệ với AI thông minh',
    aiEnabled: true,
    greetingMessage: 'Chào bạn! Tôi là AI assistant có thể phân tích hình ảnh và tư vấn sản phẩm phù hợp. Hãy gửi ảnh hoặc mô tả sản phẩm bạn cần! 🤖📱',
    categories: ['Điện tử', 'Phụ kiện']
  },
  {
    name: 'Smart Mobile World',
    pageId: 'smart_mobile_002',
    description: 'Thế giới điện thoại thông minh',
    aiEnabled: true,
    greetingMessage: 'Xin chào! Chúng tôi chuyên về điện thoại và phụ kiện. AI của chúng tôi có thể phân tích ảnh và tư vấn sản phẩm tốt nhất! 📱✨',
    categories: ['Điện tử']
  },
  {
    name: 'Apple Premium Store',
    pageId: 'apple_premium_003',
    description: 'Cửa hàng Apple chính hãng',
    aiEnabled: true,
    greetingMessage: 'Chào mừng đến Apple Store! AI của chúng tôi có thể nhận diện sản phẩm Apple và tư vấn chi tiết. Hãy gửi ảnh sản phẩm bạn quan tâm! 🍎',
    categories: ['Điện tử', 'Phụ kiện']
  }
];

/**
 * 📁 Create directories and validate setup
 */
function validateSetup() {
  console.log('🔍 Validating setup...');
  
  // Create sample images directory
  if (!fs.existsSync(CONFIG.sampleImagesPath)) {
    fs.mkdirSync(CONFIG.sampleImagesPath, { recursive: true });
    console.log(`✅ Created directory: ${CONFIG.sampleImagesPath}`);
  }
  
  // Check if backend uploads directory exists
  const uploadsDir = path.join(__dirname, 'backend/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`✅ Created directory: ${uploadsDir}`);
  }
  
  // Create products directory
  const productsDir = path.join(__dirname, 'backend/uploads/products');
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
    console.log(`✅ Created directory: ${productsDir}`);
  }
  
  console.log('✅ Directory setup validated');
}

/**
 * 📸 Check sample images availability
 */
function checkSampleImages() {
  console.log('📸 Checking sample images...');
  
  const availableImages = [];
  const missingImages = [];
  
  SAMPLE_IMAGES.forEach(image => {
    const imagePath = path.join(CONFIG.sampleImagesPath, image.filename);
    if (fs.existsSync(imagePath)) {
      availableImages.push(image);
      console.log(`✅ Found: ${image.filename}`);
    } else {
      missingImages.push(image);
      console.log(`❌ Missing: ${image.filename}`);
    }
  });
  
  if (missingImages.length > 0) {
    console.log('');
    console.log('📝 To complete setup, please add these sample images:');
    console.log('');
    
    missingImages.forEach(image => {
      console.log(`📷 ${image.filename}`);
      console.log(`   Product: ${image.productName}`);
      console.log(`   Category: ${image.category}`);
      console.log(`   Expected keywords: ${image.expectedKeywords.join(', ')}`);
      console.log(`   Save to: ${path.join(CONFIG.sampleImagesPath, image.filename)}`);
      console.log('');
    });
    
    console.log('💡 Image requirements:');
    console.log('   - Format: JPG, PNG, WebP');
    console.log('   - Size: 500KB - 5MB');
    console.log('   - Resolution: 800x800px minimum');
    console.log('   - Background: White/clean preferred');
    console.log('   - Quality: High, clear product visibility');
  }
  
  return { available: availableImages, missing: missingImages };
}

/**
 * 🌱 Seed database with sample data
 */
async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');
  
  try {
    // Check if backend is running
    const healthCheck = await axios.get(`${CONFIG.backendUrl}/health`);
    if (healthCheck.status !== 200) {
      throw new Error('Backend server is not running');
    }
    
    // Create sample fanpages
    const createdFanpages = [];
    
    for (const fanpage of SAMPLE_FANPAGES) {
      try {
        const response = await axios.post(`${CONFIG.backendUrl}/fanpages`, fanpage);
        if (response.data.success) {
          createdFanpages.push(response.data.data);
          console.log(`✅ Created fanpage: ${fanpage.name}`);
        }
      } catch (error) {
        if (error.response && error.response.status === 409) {
          console.log(`⚠️  Fanpage already exists: ${fanpage.name}`);
        } else {
          console.log(`❌ Failed to create fanpage: ${fanpage.name} - ${error.message}`);
        }
      }
    }
    
    // Create sample products with AI analysis
    const { available } = checkSampleImages();
    const createdProducts = [];
    
    for (const imageData of available) {
      try {
        // First analyze the image
        const imageUrl = `${CONFIG.backendUrl}/uploads/samples/${imageData.filename}`;
        const analysisResponse = await axios.post(`${CONFIG.backendUrl}/products/analyze-image`, {
          imageUrl
        });
        
        if (!analysisResponse.data.success) {
          console.log(`❌ Failed to analyze: ${imageData.filename}`);
          continue;
        }
        
        const analysis = analysisResponse.data.data.analysis;
        
        // Create product with AI analysis
        const productData = {
          name: imageData.productName,
          category: imageData.category,
          basePrice: imageData.basePrice,
          description: imageData.description,
          searchKeywords: [...imageData.expectedKeywords, ...analysis.keywords].filter((v, i, a) => a.indexOf(v) === i),
          images: [{
            url: imageUrl,
            filename: imageData.filename,
            originalName: imageData.filename,
            aiAnalysis: analysis
          }],
          // Add to all sample fanpages
          fanpages: createdFanpages.map(fanpage => ({
            fanpageId: fanpage._id,
            customName: imageData.productName,
            price: Math.round(imageData.basePrice * 1.3), // 30% markup
            priority: 5,
            isActive: true
          }))
        };
        
        const productResponse = await axios.post(`${CONFIG.backendUrl}/products`, productData);
        
        if (productResponse.data.success) {
          createdProducts.push(productResponse.data.data);
          console.log(`✅ Created product: ${imageData.productName}`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to create product: ${imageData.productName} - ${error.message}`);
      }
    }
    
    // Save test data for reference
    const testData = {
      fanpages: createdFanpages,
      products: createdProducts,
      sampleImages: available,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(CONFIG.testDataPath, JSON.stringify(testData, null, 2));
    
    console.log('');
    console.log('📊 Database seeding completed:');
    console.log(`   👥 Fanpages: ${createdFanpages.length}`);
    console.log(`   📦 Products: ${createdProducts.length}`);
    console.log(`   📸 Images analyzed: ${available.length}`);
    console.log(`   💾 Test data saved to: ${CONFIG.testDataPath}`);
    
    return testData;
    
  } catch (error) {
    console.log(`❌ Database seeding failed: ${error.message}`);
    throw error;
  }
}

/**
 * 🧹 Clean test data
 */
async function cleanTestData() {
  console.log('🧹 Cleaning test data...');
  
  try {
    // Load test data
    if (!fs.existsSync(CONFIG.testDataPath)) {
      console.log('No test data file found, nothing to clean');
      return;
    }
    
    const testData = JSON.parse(fs.readFileSync(CONFIG.testDataPath, 'utf8'));
    
    // Delete test products
    for (const product of testData.products || []) {
      try {
        await axios.delete(`${CONFIG.backendUrl}/products/${product._id}`);
        console.log(`✅ Deleted product: ${product.name}`);
      } catch (error) {
        console.log(`⚠️  Could not delete product: ${product.name}`);
      }
    }
    
    // Delete test fanpages
    for (const fanpage of testData.fanpages || []) {
      try {
        await axios.delete(`${CONFIG.backendUrl}/fanpages/${fanpage._id}`);
        console.log(`✅ Deleted fanpage: ${fanpage.name}`);
      } catch (error) {
        console.log(`⚠️  Could not delete fanpage: ${fanpage.name}`);
      }
    }
    
    // Remove test data file
    fs.unlinkSync(CONFIG.testDataPath);
    console.log('✅ Test data cleaned successfully');
    
  } catch (error) {
    console.log(`❌ Clean failed: ${error.message}`);
  }
}

/**
 * 📈 Generate test data statistics
 */
async function generateStats() {
  console.log('📈 Generating test data statistics...');
  
  try {
    const stats = await axios.get(`${CONFIG.backendUrl}/products/ai-stats`);
    
    console.log('');
    console.log('📊 Current Database Statistics:');
    console.log(`   📦 Total products: ${stats.data.totalProducts}`);
    console.log(`   🤖 Products with AI: ${stats.data.productsWithAI}`);
    console.log(`   📈 AI coverage: ${(stats.data.aiCoverage * 100).toFixed(1)}%`);
    console.log(`   🖼️  Total images: ${stats.data.totalImages}`);
    console.log(`   🔍 Total keywords: ${stats.data.totalKeywords}`);
    console.log(`   🎯 Average confidence: ${(stats.data.avgConfidence * 100).toFixed(1)}%`);
    
    if (stats.data.topKeywords && stats.data.topKeywords.length > 0) {
      console.log('   🏆 Top keywords:');
      stats.data.topKeywords.slice(0, 10).forEach((keyword, index) => {
        console.log(`      ${index + 1}. ${keyword.keyword}: ${keyword.count} times`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Stats generation failed: ${error.message}`);
  }
}

/**
 * 🎬 Main execution
 */
async function main() {
  const command = process.argv[2];
  
  console.log('📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸');
  console.log('🎬 Sample Data Preparation Script Started!');
  console.log('📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸📸');
  console.log('');
  
  try {
    validateSetup();
    
    switch (command) {
      case 'check':
        checkSampleImages();
        break;
        
      case 'seed':
        await seedDatabase();
        break;
        
      case 'clean':
        await cleanTestData();
        break;
        
      case 'stats':
        await generateStats();
        break;
        
      case 'full':
        checkSampleImages();
        await seedDatabase();
        await generateStats();
        break;
        
      default:
        console.log('🔧 Available commands:');
        console.log('   npm run prepare:check   - Check sample images availability');
        console.log('   npm run prepare:seed    - Seed database with sample data');
        console.log('   npm run prepare:clean   - Clean test data from database');
        console.log('   npm run prepare:stats   - Show current database statistics');
        console.log('   npm run prepare:full    - Run complete preparation workflow');
        console.log('');
        console.log('💡 Example: npm run prepare:full');
    }
    
  } catch (error) {
    console.log('');
    console.log('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
    console.log('💥 PREPARATION ERROR');
    console.log('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('1. Ensure backend server is running');
    console.log('2. Add sample images to backend/uploads/samples/');
    console.log('3. Check MongoDB connection');
    console.log('4. Verify API endpoints are working');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateSetup,
  checkSampleImages,
  seedDatabase,
  cleanTestData,
  generateStats,
  SAMPLE_IMAGES,
  SAMPLE_FANPAGES
};