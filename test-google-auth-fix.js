// Test Google Auth credentials after fix
console.log('🔑 Testing Google Auth Credentials...\n');

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
      timeout: 10000
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

async function testGoogleAuthAfterFix() {
  console.log('Testing Google Auth after setting GOOGLE_APPLICATION_CREDENTIALS...\n');
  
  try {
    // First, test a simple Summary4 sync to see if Google Auth works
    console.log('1. Testing Summary4 sync all (this will test Google Auth)...');
    const syncResult = await makeRequest('POST', '/summary4/sync-google-all');
    
    console.log(`   Status: ${syncResult.status} - ${syncResult.message}`);
    
    if (syncResult.data) {
      console.log(`   Total: ${syncResult.data.total || 'N/A'}`);
      console.log(`   Success: ${syncResult.data.success || 'N/A'}`);
      console.log(`   Failed: ${syncResult.data.failed || 'N/A'}`);
      
      if (syncResult.data.errors && syncResult.data.errors.length > 0) {
        console.log('\n   🚨 Errors found:');
        syncResult.data.errors.forEach((error, index) => {
          console.log(`      ${index + 1}. ${error}`);
        });
      } else {
        console.log('\n   ✅ All syncs successful - Google Auth is working!');
      }
    }
    
    // Test individual sync with a proper agent ID
    console.log('\n2. Testing individual agent sync...');
    const recordsResult = await makeRequest('GET', '/summary4?limit=1');
    
    if (recordsResult.data && recordsResult.data.data && recordsResult.data.data.length > 0) {
      const record = recordsResult.data.data[0];
      
      // Extract the actual string ID from the agentId object
      let agentId;
      if (typeof record.agentId === 'object' && record.agentId._id) {
        agentId = record.agentId._id;
      } else if (typeof record.agentId === 'string') {
        agentId = record.agentId;
      } else {
        agentId = String(record.agentId);
      }
      
      console.log(`   Testing with agent: ${record.agentName || 'Unknown'}`);
      console.log(`   Agent ID: ${agentId}`);
      
      const individualResult = await makeRequest('POST', `/summary4/sync-google/${agentId}`);
      console.log(`   Individual sync: ${individualResult.status} - ${individualResult.message}`);
      
      if (individualResult.data.success) {
        console.log(`   ✅ Individual sync successful for agent: ${individualResult.data.agentId}`);
      } else if (individualResult.data.error) {
        console.log(`   ❌ Individual sync error: ${individualResult.data.error}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

async function checkEnvironmentVariables() {
  console.log('🔍 Environment Variables Check:\n');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if .env file exists and contains Google credentials
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ .env file found');
      
      if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
        console.log('✅ GOOGLE_APPLICATION_CREDENTIALS is set in .env');
        const match = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS=(.*)/);
        if (match) {
          console.log(`   Path: ${match[1]}`);
        }
      } else {
        console.log('❌ GOOGLE_APPLICATION_CREDENTIALS not found in .env');
      }
    } else {
      console.log('❌ .env file not found');
    }
    
    // Check if credentials file exists
    const credPaths = [
      './backend/dongbodulieuweb-8de0c9a12896.json',
      './dongbodulieuweb-8de0c9a12896.json'
    ];
    
    for (const credPath of credPaths) {
      if (fs.existsSync(credPath)) {
        console.log(`✅ Google credentials file found: ${credPath}`);
        break;
      }
    }
    
  } catch (error) {
    console.log(`❌ Environment check failed: ${error.message}`);
  }
}

async function main() {
  console.log('📋 Google Auth Fix Verification\n');
  console.log('==========================================\n');
  
  // Check environment setup
  await checkEnvironmentVariables();
  
  console.log('\n==========================================\n');
  
  // Test Google Auth functionality
  await testGoogleAuthAfterFix();
  
  console.log('\n==========================================');
  console.log('✅ Google Auth test completed');
  console.log('\n💡 Next steps:');
  console.log('   1. Restart backend server to load new environment variables');
  console.log('   2. Test sync functionality again');
  console.log('   3. Monitor backend logs for Google Auth messages');
}

main().catch(console.error);