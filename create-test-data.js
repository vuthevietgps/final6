/**
 * Script tạo test data để debug AI functionality
 */

const fetch = require('node-fetch');
const baseUrl = 'http://localhost:3000';

async function createTestData() {
  try {
    console.log('🔧 Creating test data for AI functionality...\n');

    // 1. Tạo OpenAI Config với placeholder key
    console.log('1️⃣ Creating OpenAI Config...');
    const configResponse = await fetch(`${baseUrl}/openai-configs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token' // Bypass auth for testing
      },
      body: JSON.stringify({
        name: 'Test AI Config',
        description: 'Config for testing',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test-key-for-testing', // Placeholder key
        systemPrompt: 'Bạn là trợ lý AI thân thiện của cửa hàng. Trả lời ngắn gọn và hữu ích.',
        maxTokens: 150,
        temperature: 0.7,
        scopeType: 'global',
        status: 'active',
        isDefault: true
      })
    });

    if (!configResponse.ok) {
      console.log('❌ OpenAI Config creation failed:', await configResponse.text());
      return;
    }
    
    const config = await configResponse.json();
    console.log('✅ OpenAI Config created:', config._id);

    // 2. Tạo Fanpage test
    console.log('\n2️⃣ Creating Test Fanpage...');
    const fanpageResponse = await fetch(`${baseUrl}/fanpages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token'
      },
      body: JSON.stringify({
        pageId: '123456789',
        name: 'Page tạp bán hàng',
        accessToken: 'test-access-token',
        status: 'active',
        description: 'Cửa hàng bán đồ gia dụng, điện tử, thời trang. Giao hàng toàn quốc.',
        greetingScript: 'Chào bạn! Cảm ơn bạn đã liên hệ. Chúng tôi sẽ hỗ trợ bạn ngay.',
        aiEnabled: true,
        openAIConfigId: config._id
      })
    });

    if (!fanpageResponse.ok) {
      console.log('❌ Fanpage creation failed:', await fanpageResponse.text());
      return;
    }

    const fanpage = await fanpageResponse.json();
    console.log('✅ Fanpage created:', fanpage._id);

    console.log('\n🎉 Test data created successfully!');
    console.log('📋 Test Details:');
    console.log(`   - PageID: 123456789`);
    console.log(`   - PSID: 24776034528751852`);
    console.log(`   - AI Config: ${config._id}`);
    console.log(`   - Fanpage: ${fanpage._id}`);
    
    console.log('\n🔥 Now you can test webhook with:');
    console.log('node test-webhook.js');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  }
}

createTestData();