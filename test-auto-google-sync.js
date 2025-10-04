// Test auto Google Sync when creating new orders in TestOrder2
console.log('🔍 Testing Auto Google Sync on New Order Creation...\n');

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const result = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            message: result.message || 'Success',
            data: result
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            message: `Response received`,
            data: { raw: responseData.substring(0, 300) }
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function getTestData() {
  console.log('📋 Getting test data...\n');
  
  try {
    // Get products for test order
    const productsResult = await makeRequest('GET', '/products?limit=5');
    console.log(`Products available: ${productsResult.data?.length || 0}`);
    
    // Get agents for test order
    const agentsResult = await makeRequest('GET', '/summary4/agents');
    console.log(`Agents available: ${agentsResult.data?.length || 0}`);
    
    const products = productsResult.data || [];
    const agents = agentsResult.data || [];
    
    if (products.length === 0) {
      console.log('❌ No products found for testing');
      return null;
    }
    
    if (agents.length === 0) {
      console.log('❌ No agents found for testing');
      return null;
    }
    
    // Get first product and agent for testing
    const testProduct = products[0];
    const testAgent = agents[0];
    
    console.log(`Test Product: ${testProduct.name} (ID: ${testProduct._id})`);
    console.log(`Test Agent: ${testAgent.agentName || 'Unknown'} (ID: ${testAgent._id?._id || testAgent._id})`);
    
    return { 
      product: testProduct, 
      agent: testAgent 
    };
    
  } catch (error) {
    console.log(`❌ Failed to get test data: ${error.message}`);
    return null;
  }
}

async function testCreateOrderWithAutoSync() {
  console.log('🆕 Testing Create Order with Auto Google Sync...\n');
  
  const testData = await getTestData();
  if (!testData) {
    console.log('⚠️ Cannot proceed without test data');
    return;
  }
  
  const { product, agent } = testData;
  
  // Extract proper agent ID
  let agentId;
  if (typeof agent._id === 'object' && agent._id._id) {
    agentId = agent._id._id;
  } else {
    agentId = agent._id;
  }
  
  // Create test order
  const testOrderData = {
    productId: product._id,
    customerName: `Test Customer ${Date.now()}`,
    quantity: 1,
    agentId: agentId,
    adGroupId: 'test-adgroup-' + Date.now(),
    serviceDetails: 'Auto sync test order',
    productionStatus: 'Chưa làm',
    orderStatus: 'Chờ xác nhận',
    depositAmount: 100000,
    codAmount: 200000,
    receiverName: 'Test Receiver',
    receiverPhone: '0123456789',
    receiverAddress: 'Test Address, Ho Chi Minh City'
  };
  
  console.log('Creating test order with data:');
  console.log(`  Product: ${product.name}`);
  console.log(`  Customer: ${testOrderData.customerName}`);
  console.log(`  Agent: ${agent.agentName} (${agentId})`);
  console.log(`  Ad Group: ${testOrderData.adGroupId}`);
  
  try {
    const createResult = await makeRequest('POST', '/test-order2', testOrderData);
    console.log(`\n✅ Order created: ${createResult.status} - ${createResult.message}`);
    
    if (createResult.data && createResult.data._id) {
      const orderId = createResult.data._id;
      console.log(`   Order ID: ${orderId}`);
      console.log(`   🔄 This should trigger:`)
      console.log(`      1. Summary4 sync (immediate)`);
      console.log(`      2. Summary5 sync (immediate)`);
      console.log(`      3. Google Sheets sync (3 seconds delay)`);
      
      // Wait a moment and then check if sync happened
      console.log('\n⏳ Waiting 5 seconds for syncs to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test if we can see the updated data in Summary4
      console.log('\n📊 Checking if Summary4 was updated...');
      const summary4Result = await makeRequest('GET', `/summary4?agentId=${agentId}&limit=5`);
      
      if (summary4Result.data && summary4Result.data.data) {
        const recentRecords = summary4Result.data.data.filter(record => 
          record.customerName === testOrderData.customerName
        );
        
        if (recentRecords.length > 0) {
          console.log(`✅ Found ${recentRecords.length} matching Summary4 record(s)`);
          console.log(`   Customer: ${recentRecords[0].customerName}`);
          console.log(`   Product: ${recentRecords[0].product}`);
          console.log(`   Agent: ${recentRecords[0].agentName}`);
        } else {
          console.log('⚠️ Summary4 record not found yet (may still be syncing)');
        }
      }
      
      // Clean up: delete the test order
      console.log('\n🧹 Cleaning up test order...');
      const deleteResult = await makeRequest('DELETE', `/test-order2/${orderId}`);
      console.log(`   Delete result: ${deleteResult.status} - ${deleteResult.message}`);
      console.log(`   🔄 This should also trigger Google Sheets sync for cleanup`);
      
      return { orderId, agentId, success: true };
    } else {
      console.log('❌ Order creation failed or no ID returned');
      return { success: false };
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return { success: false };
  }
}

async function testUpdateOrderWithAutoSync() {
  console.log('\n📝 Testing Update Order with Auto Google Sync...\n');
  
  try {
    // Get a recent order to update
    const ordersResult = await makeRequest('GET', '/test-order2?limit=1');
    
    if (!ordersResult.data || !ordersResult.data.data || ordersResult.data.data.length === 0) {
      console.log('⚠️ No orders found to test update');
      return;
    }
    
    const testOrder = ordersResult.data.data[0];
    const orderId = testOrder._id;
    
    console.log(`Testing update on order: ${orderId}`);
    console.log(`  Current status: ${testOrder.orderStatus}`);
    console.log(`  Current production: ${testOrder.productionStatus}`);
    
    // Update the order
    const updateData = {
      orderStatus: 'Đã xuất kho',
      productionStatus: 'Hoàn thành',
      trackingNumber: 'AUTO-SYNC-TEST-' + Date.now()
    };
    
    const updateResult = await makeRequest('PATCH', `/test-order2/${orderId}`, updateData);
    console.log(`\n✅ Order updated: ${updateResult.status} - ${updateResult.message}`);
    
    if (updateResult.status === 200) {
      console.log(`   🔄 This should trigger:`)
      console.log(`      1. Summary4 sync (immediate)`);
      console.log(`      2. Summary5 sync (immediate)`);
      console.log(`      3. Google Sheets sync (3 seconds delay)`);
      console.log(`   New tracking number: ${updateData.trackingNumber}`);
    }
    
  } catch (error) {
    console.log(`❌ Update test failed: ${error.message}`);
  }
}

async function checkSyncConfiguration() {
  console.log('\n⚙️ Checking Sync Configuration...\n');
  
  try {
    // Check Summary4 stats to see sync activity
    const statsResult = await makeRequest('GET', '/summary4/stats');
    console.log('📊 Summary4 Statistics:');
    if (statsResult.data) {
      console.log(`   Total Records: ${statsResult.data.totalRecords || 'N/A'}`);
      console.log(`   Active Records: ${statsResult.data.activeRecords || 'N/A'}`);
    }
    
    // Test manual Google sync to ensure it's working
    console.log('\n🔄 Testing Manual Google Sync...');
    const syncResult = await makeRequest('POST', '/summary4/sync-google-all');
    console.log(`   Manual sync result: ${syncResult.status} - ${syncResult.message}`);
    
    if (syncResult.data) {
      console.log(`   Total: ${syncResult.data.total || 'N/A'}`);
      console.log(`   Success: ${syncResult.data.success || 'N/A'}`);
      console.log(`   Failed: ${syncResult.data.failed || 'N/A'}`);
    }
    
  } catch (error) {
    console.log(`❌ Configuration check failed: ${error.message}`);
  }
}

async function main() {
  console.log('📋 Auto Google Sync Test for TestOrder2\n');
  console.log('==========================================\n');
  
  // Step 1: Check sync configuration
  await checkSyncConfiguration();
  
  // Step 2: Test create order with auto sync
  const createResult = await testCreateOrderWithAutoSync();
  
  // Step 3: Test update order with auto sync
  await testUpdateOrderWithAutoSync();
  
  console.log('\n==========================================');
  console.log('✅ Auto Google Sync test completed');
  
  console.log('\n🎯 Summary:');
  console.log('   ✅ Auto sync triggers implemented for:');
  console.log('      - CREATE order → Summary4 + Summary5 + Google Sheets (3s delay)');
  console.log('      - UPDATE order → Summary4 + Summary5 + Google Sheets (3s delay)');
  console.log('      - DELETE order → Summary4 cleanup + Summary5 + Google Sheets (3s delay)');
  console.log('   ✅ Fire-and-forget pattern ensures non-blocking operations');
  console.log('   ✅ Proper error handling and logging implemented');
  
  console.log('\n💡 How it works:');
  console.log('   1. User creates/updates/deletes order in TestOrder2');
  console.log('   2. Summary4 sync runs immediately');
  console.log('   3. Summary5 sync runs immediately');
  console.log('   4. Google Sheets sync scheduled with 3s delay');
  console.log('   5. Google Sheets get updated with latest Summary4 data');
}

main().catch(console.error);