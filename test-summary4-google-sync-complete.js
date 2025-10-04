// Test Summary4 Google Sync functionality with correct endpoints
console.log('🔍 Testing Summary4 Google Sync System (Updated)...\n');

const http = require('http');
const fs = require('fs');

// Test server connection
function testServerConnection() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend server is running');
        resolve(true);
      });
    });
    
    req.on('error', () => {
      console.log('❌ Backend server is not running');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Connection timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Make HTTP request
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
      timeout: 30000 // Increased timeout for sync operations
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
            message: `Response received (${responseData.length} chars)`,
            data: { raw: responseData.substring(0, 200) }
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

// Test Summary4 data and stats
async function testSummary4Data() {
  console.log('📊 Testing Summary4 Data...\n');
  
  try {
    // Get Summary4 records
    const summary4Result = await makeRequest('GET', '/summary4');
    console.log(`✅ Summary4 records: ${summary4Result.status} - Found ${summary4Result.data.data?.length || 0} records`);
    
    // Get stats
    const statsResult = await makeRequest('GET', '/summary4/stats');
    console.log(`✅ Summary4 stats: ${statsResult.status}`);
    if (statsResult.data) {
      console.log(`   📈 Total records: ${statsResult.data.totalRecords || 'N/A'}`);
      console.log(`   💰 Total revenue: ${statsResult.data.totalRevenue || 'N/A'}`);
      console.log(`   🏪 Total agents: ${statsResult.data.totalAgents || 'N/A'}`);
    }
    
    // Get agents
    const agentsResult = await makeRequest('GET', '/summary4/agents');
    console.log(`✅ Summary4 agents: ${agentsResult.status} - Found ${agentsResult.data?.length || 0} agents`);
    
    return {
      summary4Records: summary4Result.data.data || [],
      agents: agentsResult.data || []
    };
    
  } catch (error) {
    console.log(`❌ Error testing Summary4 data: ${error.message}`);
    return null;
  }
}

// Test Google Sync endpoints
async function testGoogleSyncEndpoints(agents) {
  console.log('\n🔄 Testing Google Sync Endpoints...\n');
  
  if (!agents || agents.length === 0) {
    console.log('⚠️ No agents found - cannot test individual sync');
    return;
  }
  
  // Test individual agent sync (first agent)
  const testAgent = agents[0];
  console.log(`Testing individual sync for agent: ${testAgent.fullName || testAgent.email || testAgent._id}`);
  
  try {
    const individualResult = await makeRequest('POST', `/summary4/sync-google/${testAgent._id}`);
    console.log(`✅ Individual sync: ${individualResult.status} - ${individualResult.message}`);
    
    if (individualResult.data.success) {
      console.log(`   🎯 Agent: ${individualResult.data.agentId}`);
    } else if (individualResult.data.error) {
      console.log(`   ❌ Error: ${individualResult.data.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Individual sync failed: ${error.message}`);
  }
  
  // Test sync all agents
  console.log('\nTesting sync all agents...');
  try {
    const syncAllResult = await makeRequest('POST', '/summary4/sync-google-all');
    console.log(`✅ Sync all agents: ${syncAllResult.status} - ${syncAllResult.message}`);
    
    if (syncAllResult.data) {
      console.log(`   📊 Total: ${syncAllResult.data.total || 'N/A'}`);
      console.log(`   ✅ Success: ${syncAllResult.data.success || 'N/A'}`);
      console.log(`   ❌ Failed: ${syncAllResult.data.failed || 'N/A'}`);
      
      if (syncAllResult.data.errors && syncAllResult.data.errors.length > 0) {
        console.log(`   🚨 Errors:`);
        syncAllResult.data.errors.forEach((error, index) => {
          console.log(`      ${index + 1}. ${error}`);
        });
      }
    }
    
  } catch (error) {
    console.log(`❌ Sync all agents failed: ${error.message}`);
  }
}

// Check Google credentials
function checkGoogleCredentials() {
  console.log('\n🔑 Checking Google Credentials...\n');
  
  const credPaths = [
    './dongbodulieuweb-8de0c9a12896.json',
    './backend/dongbodulieuweb-8de0c9a12896.json',
    '../dongbodulieuweb-8de0c9a12896.json'
  ];
  
  let credFound = false;
  for (const path of credPaths) {
    if (fs.existsSync(path)) {
      console.log(`✅ Google credentials found at: ${path}`);
      credFound = true;
      break;
    }
  }
  
  if (!credFound) {
    console.log('❌ Google credentials file not found in expected locations');
    console.log('   Expected files: dongbodulieuweb-8de0c9a12896.json');
  }
  
  // Check environment variable
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS set to: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
    console.log('✅ GOOGLE_CREDENTIALS_JSON environment variable set');
  } else {
    console.log('⚠️ No Google credentials environment variables set');
  }
  
  return credFound;
}

// Test specific functionality
async function testGoogleSyncFeatures() {
  console.log('\n🧪 Testing Google Sync Features...\n');
  
  // Test sync trigger from manual payment update
  console.log('Testing sync trigger from manual payment update...');
  
  try {
    // Get first Summary4 record
    const summary4Result = await makeRequest('GET', '/summary4?limit=1');
    if (summary4Result.data.data && summary4Result.data.data.length > 0) {
      const record = summary4Result.data.data[0];
      console.log(`Found test record: ${record._id}`);
      
      // Try to update manual payment (this should trigger Google sync)
      const updateResult = await makeRequest('PATCH', `/summary4/${record._id}/manual-payment`, {
        manualPayment: record.manualPayment || 0
      });
      
      console.log(`✅ Manual payment update: ${updateResult.status} - ${updateResult.message}`);
      console.log('   🔄 This should trigger automatic Google sync for the agent');
      
    } else {
      console.log('⚠️ No Summary4 records found for testing manual payment update');
    }
    
  } catch (error) {
    console.log(`❌ Manual payment update test failed: ${error.message}`);
  }
}

// Display sync documentation
function displaySyncDocumentation() {
  console.log('\n📚 Summary4 Google Sync Documentation\n');
  console.log('==========================================');
  console.log('Available Endpoints:');
  console.log('• GET /summary4 - Get Summary4 records');
  console.log('• GET /summary4/stats - Get statistics'); 
  console.log('• GET /summary4/agents - Get agents list');
  console.log('• POST /summary4/sync-google/{agentId} - Sync specific agent to Google Sheet');
  console.log('• POST /summary4/sync-google-all - Sync all agents to Google Sheets');
  console.log('• PATCH /summary4/{id}/manual-payment - Update manual payment (triggers auto sync)');
  console.log('');
  console.log('Requirements:');
  console.log('• Users must have googleDriveLink field in their profile');
  console.log('• Google credentials must be configured (dongbodulieuweb-8de0c9a12896.json)');
  console.log('• Google Sheets API must be enabled');
  console.log('');
  console.log('Features:');
  console.log('• Automatic sync on manual payment updates');
  console.log('• Debounce mechanism (2 seconds) to prevent excessive syncing');
  console.log('• Creates "Summary4" sheet tab automatically');
  console.log('• 17 columns of data: from order date to payment details');
  console.log('• Error handling and comprehensive logging');
  console.log('==========================================');
}

// Main execution
async function main() {
  console.log('📋 Summary4 Google Sync System Check\n');
  console.log('==========================================\n');
  
  // Step 1: Check server connection
  const serverRunning = await testServerConnection();
  if (!serverRunning) {
    console.log('⚠️ Backend server is not running - please start it first');
    console.log('Command: cd backend && npm run start:dev');
    return;
  }
  
  // Step 2: Check Google credentials
  checkGoogleCredentials();
  
  // Step 3: Test Summary4 data
  const dataResult = await testSummary4Data();
  if (!dataResult) {
    console.log('❌ Cannot proceed - Summary4 data not accessible');
    return;
  }
  
  // Step 4: Test Google Sync endpoints
  await testGoogleSyncEndpoints(dataResult.agents);
  
  // Step 5: Test additional features
  await testGoogleSyncFeatures();
  
  // Step 6: Show documentation
  displaySyncDocumentation();
  
  console.log('\n✅ Summary4 Google Sync system check completed');
}

main().catch(console.error);