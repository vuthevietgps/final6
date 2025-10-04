// Test Summary4 Google Sync functionality
console.log('🔍 Testing Summary4 Google Sync System...\n');

const http = require('http');

// Test if server is running
function testServerConnection() {
  return new Promise((resolve, reject) => {
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
    
    req.on('error', (err) => {
      console.log('❌ Backend server is not running:', err.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('❌ Connection timeout - server may not be running');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Test Summary4 Google Sync endpoints
async function testSummary4GoogleSync() {
  console.log('\n📊 Testing Summary4 Google Sync endpoints...\n');
  
  const serverRunning = await testServerConnection();
  if (!serverRunning) {
    console.log('⚠️ Cannot test Google Sync - backend server is not running');
    console.log('Please start the backend server first: cd backend && npm run start:dev');
    return;
  }

  // Test endpoints
  const endpoints = [
    { path: '/summary4', method: 'GET', description: 'Get Summary4 data' },
    { path: '/summary4/sync-all-google', method: 'POST', description: 'Sync all agents to Google' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
      
      const result = await makeRequest(endpoint.method, endpoint.path);
      console.log(`✅ ${endpoint.path}: ${result.status} - ${result.message}`);
      
      if (endpoint.path === '/summary4' && result.data) {
        console.log(`   📈 Found ${result.data.length || 0} Summary4 records`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.path}: ${error.message}`);
    }
  }
}

function makeRequest(method, path) {
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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            message: result.message || 'Success',
            data: result.data || result
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            message: `Response received (${data.length} chars)`,
            data: null
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
    
    if (method === 'POST') {
      req.write('{}');
    }
    req.end();
  });
}

// Check database connectivity and Google Drive links
async function checkGoogleDriveLinkStatus() {
  console.log('\n🔗 Checking Google Drive Link Status...\n');
  
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb+srv://hcmiu:hcmiupassword@hcmiu.z7rsd.mongodb.net/dongbodulieu?retryWrites=true&w=majority&appName=Hcmiu');
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('dongbodulieu');
    
    // Check users with Google Drive links
    const usersWithLinks = await db.collection('users').find({ 
      googleDriveLink: { $exists: true, $ne: null, $ne: '' } 
    }).limit(5).toArray();
    
    console.log(`📊 Found ${usersWithLinks.length} users with Google Drive links:`);
    usersWithLinks.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullName || user.email}: ${user.googleDriveLink}`);
    });
    
    // Check Summary4 records count
    const summary4Count = await db.collection('summary4s').countDocuments({ isActive: true });
    console.log(`📈 Found ${summary4Count} active Summary4 records`);
    
    // Check Google credentials
    const fs = require('fs');
    const path = require('path');
    const credPath = path.join(__dirname, 'dongbodulieuweb-8de0c9a12896.json');
    
    if (fs.existsSync(credPath)) {
      console.log('✅ Google credentials file found');
    } else {
      console.log('❌ Google credentials file not found');
    }
    
    await client.close();
    return { usersWithLinks, summary4Count };
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return null;
  }
}

// Test specific agent sync
async function testAgentSync() {
  console.log('\n🔄 Testing Individual Agent Sync...\n');
  
  const dbStatus = await checkGoogleDriveLinkStatus();
  if (!dbStatus || dbStatus.usersWithLinks.length === 0) {
    console.log('⚠️ No users with Google Drive links found - cannot test sync');
    return;
  }
  
  const testUser = dbStatus.usersWithLinks[0];
  const agentId = testUser._id.toString();
  
  console.log(`Testing sync for agent: ${testUser.fullName || testUser.email} (${agentId})`);
  
  try {
    const result = await makeRequest('POST', `/summary4/sync-google/${agentId}`);
    console.log(`✅ Individual sync result: ${result.message}`);
    console.log(`   Status: ${result.status}`);
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Individual sync failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('📋 Summary4 Google Sync System Check\n');
  console.log('==========================================\n');
  
  // Step 1: Check database and Google Drive links
  await checkGoogleDriveLinkStatus();
  
  // Step 2: Test API endpoints
  await testSummary4GoogleSync();
  
  // Step 3: Test individual agent sync
  await testAgentSync();
  
  console.log('\n==========================================');
  console.log('✅ Summary4 Google Sync system check completed');
  console.log('\n💡 To manually test sync:');
  console.log('   - POST /summary4/sync-google/{agentId} - Sync specific agent');
  console.log('   - POST /summary4/sync-all-google - Sync all agents');
  console.log('   - GET /summary4 - View Summary4 data');
}

main().catch(console.error);