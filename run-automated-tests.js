/**
 * 🧪 Automated Test Suite for Vision AI + Product Management
 * 
 * Comprehensive testing script that validates all Vision AI functionality:
 * - API endpoint testing
 * - AI analysis validation  
 * - File upload testing
 * - Search functionality testing
 * - Performance benchmarking
 * - Error handling verification
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const CONFIG = {
  backend: 'http://localhost:3000',
  frontend: 'http://localhost:4200',
  timeout: 30000,
  sampleImagesPath: path.join(__dirname, 'backend/uploads/samples'),
  testResultsPath: path.join(__dirname, 'test-results.json')
};

// Test results tracking
let testResults = {
  startTime: new Date().toISOString(),
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testCases: []
};

/**
 * 🎯 Test Case Result Logger
 */
function logTestResult(testName, passed, details = {}) {
  const result = {
    testName,
    passed,
    timestamp: new Date().toISOString(),
    details,
    duration: details.duration || 0
  };
  
  testResults.testCases.push(result);
  testResults.totalTests++;
  
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failedTests++;
    console.log(`❌ ${testName}`);
    if (details.error) {
      console.log(`   Error: ${details.error}`);
    }
  }
  
  if (details.additionalInfo) {
    console.log(`   Info: ${details.additionalInfo}`);
  }
}

/**
 * 🚀 Test Runner Utility
 */
async function runTest(testName, testFunction) {
  const startTime = Date.now();
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;
    logTestResult(testName, true, { 
      duration, 
      additionalInfo: result?.info || `Completed in ${duration}ms` 
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult(testName, false, { 
      duration, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * 📡 Test 1: Server Health Check
 */
async function testServerHealth() {
  return runTest('Server Health Check', async () => {
    const response = await axios.get(`${CONFIG.backend}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    return { info: 'Backend server is healthy' };
  });
}

/**
 * 🖼️ Test 2: Vision AI Image Analysis
 */
async function testVisionAIAnalysis() {
  return runTest('Vision AI Image Analysis', async () => {
    const testImageUrl = `${CONFIG.backend}/uploads/samples/iphone-15-pro-max.jpg`;
    
    const response = await axios.post(`${CONFIG.backend}/products/analyze-image`, {
      imageUrl: testImageUrl
    }, {
      timeout: CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.data.success) {
      throw new Error('AI analysis failed');
    }
    
    const analysis = response.data.data.analysis;
    
    // Validate analysis structure
    if (!analysis.objects || !Array.isArray(analysis.objects)) {
      throw new Error('Missing or invalid objects array');
    }
    
    if (!analysis.keywords || !Array.isArray(analysis.keywords)) {
      throw new Error('Missing or invalid keywords array');
    }
    
    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
      throw new Error('Invalid confidence score');
    }
    
    // Check for expected iPhone keywords
    const expectedKeywords = ['iphone', 'apple', 'phone'];
    const foundKeywords = expectedKeywords.filter(keyword => 
      analysis.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    if (foundKeywords.length === 0) {
      throw new Error('No expected iPhone keywords found in analysis');
    }
    
    return { 
      info: `AI analysis successful - ${foundKeywords.length}/${expectedKeywords.length} expected keywords found, confidence: ${(analysis.confidence * 100).toFixed(1)}%` 
    };
  });
}

/**
 * 📤 Test 3: File Upload and Processing
 */
async function testFileUpload() {
  return runTest('File Upload and Processing', async () => {
    // Check if sample image exists
    const sampleImagePath = path.join(CONFIG.sampleImagesPath, 'iphone-15-pro-max.jpg');
    if (!fs.existsSync(sampleImagePath)) {
      throw new Error('Sample image not found: ' + sampleImagePath);
    }
    
    // Create form data
    const form = new FormData();
    form.append('images', fs.createReadStream(sampleImagePath));
    form.append('fanpageId', 'test_fanpage_123');
    
    const response = await axios.post(`${CONFIG.backend}/products/upload-images`, form, {
      timeout: CONFIG.timeout,
      headers: {
        ...form.getHeaders()
      }
    });
    
    if (!response.data.success) {
      throw new Error('File upload failed');
    }
    
    const uploadData = response.data.data;
    
    // Validate upload response structure
    if (!uploadData.images || !Array.isArray(uploadData.images)) {
      throw new Error('Missing or invalid images array in response');
    }
    
    const image = uploadData.images[0];
    
    // Validate image data structure
    if (!image.url || !image.filename) {
      throw new Error('Missing required image data (url, filename)');
    }
    
    if (!image.optimized || !image.optimized.thumbnail || !image.optimized.medium || !image.optimized.large) {
      throw new Error('Missing optimized versions');
    }
    
    if (!image.aiAnalysis || !image.aiAnalysis.objects) {
      throw new Error('Missing AI analysis data');
    }
    
    // Test if uploaded files are accessible
    const urlsToTest = [
      image.url,
      image.optimized.thumbnail,
      image.optimized.medium,
      image.optimized.large
    ];
    
    for (const url of urlsToTest) {
      try {
        const fileResponse = await axios.head(url, { timeout: 5000 });
        if (fileResponse.status !== 200) {
          throw new Error(`File not accessible: ${url}`);
        }
      } catch (error) {
        throw new Error(`Cannot access uploaded file: ${url} - ${error.message}`);
      }
    }
    
    return { 
      info: `Upload successful - 4 versions created, AI analysis included, confidence: ${(image.aiAnalysis.confidence * 100).toFixed(1)}%` 
    };
  });
}

/**
 * 🔍 Test 4: Product Search Functionality
 */
async function testProductSearch() {
  return runTest('Product Search Functionality', async () => {
    // First create a test product to search for
    const createResponse = await axios.post(`${CONFIG.backend}/products`, {
      name: 'Test iPhone 15 Pro Max for Search',
      category: 'Điện tử',
      basePrice: 25000000,
      description: 'Test product for search functionality',
      searchKeywords: ['iphone', '15', 'pro', 'max', 'apple', 'test'],
      fanpages: [{
        fanpageId: 'test_search_fanpage',
        customName: 'iPhone 15 Pro Max Test',
        price: 28000000,
        priority: 5
      }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!createResponse.data.success) {
      throw new Error('Failed to create test product');
    }
    
    const productId = createResponse.data.data._id;
    
    // Test search functionality
    const searchQueries = [
      'iphone 15',
      'apple phone',
      'pro max',
      'điện thoại apple'
    ];
    
    let totalMatches = 0;
    
    for (const query of searchQueries) {
      const searchResponse = await axios.post(`${CONFIG.backend}/products/find-similar`, {
        query,
        fanpageId: 'test_search_fanpage',
        limit: 10
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!searchResponse.data.success) {
        throw new Error(`Search failed for query: ${query}`);
      }
      
      const results = searchResponse.data.data.recommendations;
      
      // Check if our test product is found
      const foundTestProduct = results.some(result => 
        result.product._id === productId
      );
      
      if (foundTestProduct) {
        totalMatches++;
      }
    }
    
    // Clean up test product
    try {
      await axios.delete(`${CONFIG.backend}/products/${productId}`);
    } catch (error) {
      console.log('Note: Could not clean up test product');
    }
    
    if (totalMatches === 0) {
      throw new Error('Search did not find test product for any query');
    }
    
    return { 
      info: `Search successful - test product found in ${totalMatches}/${searchQueries.length} queries` 
    };
  });
}

/**
 * 📊 Test 5: AI Statistics API
 */
async function testAIStatistics() {
  return runTest('AI Statistics API', async () => {
    const response = await axios.get(`${CONFIG.backend}/products/ai-stats`, {
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const stats = response.data;
    
    // Validate stats structure
    const requiredFields = ['totalProducts', 'productsWithAI', 'aiCoverage', 'totalImages', 'totalKeywords'];
    
    for (const field of requiredFields) {
      if (typeof stats[field] !== 'number') {
        throw new Error(`Missing or invalid field: ${field}`);
      }
    }
    
    if (!stats.topKeywords || !Array.isArray(stats.topKeywords)) {
      throw new Error('Missing or invalid topKeywords array');
    }
    
    return { 
      info: `Stats retrieved - ${stats.totalProducts} products, ${(stats.aiCoverage * 100).toFixed(1)}% AI coverage` 
    };
  });
}

/**
 * ⚡ Test 6: Performance Testing
 */
async function testPerformance() {
  return runTest('Performance Testing', async () => {
    const performanceResults = [];
    
    // Test 1: AI Analysis Performance
    const aiStartTime = Date.now();
    await axios.post(`${CONFIG.backend}/products/analyze-image`, {
      imageUrl: `${CONFIG.backend}/uploads/samples/iphone-15-pro-max.jpg`
    });
    const aiDuration = Date.now() - aiStartTime;
    performanceResults.push({ test: 'AI Analysis', duration: aiDuration, threshold: 5000 });
    
    // Test 2: Search Performance
    const searchStartTime = Date.now();
    await axios.post(`${CONFIG.backend}/products/find-similar`, {
      query: 'smartphone camera',
      limit: 10
    });
    const searchDuration = Date.now() - searchStartTime;
    performanceResults.push({ test: 'Product Search', duration: searchDuration, threshold: 500 });
    
    // Test 3: Stats API Performance
    const statsStartTime = Date.now();
    await axios.get(`${CONFIG.backend}/products/ai-stats`);
    const statsDuration = Date.now() - statsStartTime;
    performanceResults.push({ test: 'AI Stats', duration: statsDuration, threshold: 1000 });
    
    // Check performance thresholds
    const failedTests = performanceResults.filter(result => result.duration > result.threshold);
    
    if (failedTests.length > 0) {
      const failedInfo = failedTests.map(test => 
        `${test.test}: ${test.duration}ms (threshold: ${test.threshold}ms)`
      ).join(', ');
      throw new Error(`Performance threshold exceeded: ${failedInfo}`);
    }
    
    const avgDuration = performanceResults.reduce((sum, result) => sum + result.duration, 0) / performanceResults.length;
    
    return { 
      info: `All performance tests passed - Average response time: ${avgDuration.toFixed(0)}ms` 
    };
  });
}

/**
 * 🚨 Test 7: Error Handling
 */
async function testErrorHandling() {
  return runTest('Error Handling', async () => {
    const errorTests = [];
    
    // Test 1: Invalid image URL
    try {
      await axios.post(`${CONFIG.backend}/products/analyze-image`, {
        imageUrl: 'https://invalid-url-does-not-exist.com/image.jpg'
      });
      errorTests.push({ test: 'Invalid Image URL', passed: false });
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        errorTests.push({ test: 'Invalid Image URL', passed: true });
      } else {
        errorTests.push({ test: 'Invalid Image URL', passed: false });
      }
    }
    
    // Test 2: Missing required fields
    try {
      await axios.post(`${CONFIG.backend}/products/analyze-image`, {});
      errorTests.push({ test: 'Missing Required Fields', passed: false });
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        errorTests.push({ test: 'Missing Required Fields', passed: true });
      } else {
        errorTests.push({ test: 'Missing Required Fields', passed: false });
      }
    }
    
    // Test 3: Invalid search parameters
    try {
      await axios.post(`${CONFIG.backend}/products/find-similar`, {
        query: '',
        limit: -1
      });
      errorTests.push({ test: 'Invalid Search Parameters', passed: false });
    } catch (error) {
      if (error.response && error.response.status >= 400) {
        errorTests.push({ test: 'Invalid Search Parameters', passed: true });
      } else {
        errorTests.push({ test: 'Invalid Search Parameters', passed: false });
      }
    }
    
    const passedErrorTests = errorTests.filter(test => test.passed).length;
    
    if (passedErrorTests < errorTests.length) {
      const failedErrorTests = errorTests.filter(test => !test.passed);
      throw new Error(`Some error handling tests failed: ${failedErrorTests.map(t => t.test).join(', ')}`);
    }
    
    return { 
      info: `All error handling tests passed - ${passedErrorTests}/${errorTests.length} error scenarios handled correctly` 
    };
  });
}

/**
 * 📝 Save Test Results
 */
function saveTestResults() {
  testResults.endTime = new Date().toISOString();
  testResults.totalDuration = new Date(testResults.endTime) - new Date(testResults.startTime);
  testResults.successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
  
  fs.writeFileSync(CONFIG.testResultsPath, JSON.stringify(testResults, null, 2));
}

/**
 * 🎬 Main Test Runner
 */
async function runAllTests() {
  console.log('🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪');
  console.log('🎬 Vision AI Automated Test Suite Started!');
  console.log('🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪');
  console.log('');
  
  try {
    // Run all tests
    await testServerHealth();
    await testVisionAIAnalysis();
    await testFileUpload();
    await testProductSearch();
    await testAIStatistics();
    await testPerformance();
    await testErrorHandling();
    
    console.log('');
    console.log('══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('══════════════════════════════════════════════════════════');
    console.log(`📋 Total Tests: ${testResults.totalTests}`);
    console.log(`✅ Passed: ${testResults.passedTests}`);
    console.log(`❌ Failed: ${testResults.failedTests}`);
    console.log(`📈 Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);
    console.log('');
    
    if (testResults.failedTests === 0) {
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
      console.log('🎊 ALL TESTS PASSED! Vision AI system is ready! 🎊');
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
    } else {
      console.log('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️');
      console.log('⚠️  Some tests failed. Please check the issues above. ⚠️');
      console.log('⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️');
    }
    
  } catch (error) {
    console.log('');
    console.log('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
    console.log('💥 CRITICAL ERROR IN TEST SUITE');
    console.log('💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('🔍 Troubleshooting steps:');
    console.log('1. Ensure backend server is running on http://localhost:3000');
    console.log('2. Verify sample images exist in backend/uploads/samples/');
    console.log('3. Check OPENAI_API_KEY is configured correctly');
    console.log('4. Ensure MongoDB connection is working');
    console.log('5. Review backend logs for detailed error information');
  } finally {
    saveTestResults();
    console.log('');
    console.log(`📄 Detailed test results saved to: ${CONFIG.testResultsPath}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testServerHealth,
  testVisionAIAnalysis,
  testFileUpload,
  testProductSearch,
  testAIStatistics,
  testPerformance,
  testErrorHandling
};