/**
 * Test script kiểm tra agent và Google Drive link qua API
 */
const test = async () => {
  try {
    console.log('🔍 Testing Agent Lookup and Google Drive Link...\n');
    
    // Test 1: Check Summary4 diagnostics
    console.log('1. Checking Summary4 diagnostics...');
    const diagResponse = await fetch('http://localhost:3000/summary4/diagnostics');
    const diagnostics = await diagResponse.json();
    
    console.log('✅ Summary4 Statistics:');
    console.log(`   - Total records: ${diagnostics.summary4Stats.totalRecords}`);
    console.log(`   - Active records: ${diagnostics.summary4Stats.activeRecords}`);
    console.log(`   - Unique agents: ${diagnostics.summary4Stats.uniqueAgents}`);
    console.log(`   - Date range: ${diagnostics.summary4Stats.dateRange.earliest} to ${diagnostics.summary4Stats.dateRange.latest}`);
    
    if (diagnostics.agentStats && diagnostics.agentStats.length > 0) {
      console.log('\n✅ Top agents with Summary4 data:');
      diagnostics.agentStats.slice(0, 5).forEach((agent, index) => {
        console.log(`   ${index + 1}. Agent ID: ${agent._id} (${agent.count} records)`);
      });
    }
    
    // Test 2: Check Google credential status
    console.log('\n2. Checking Google credentials...');
    const credResponse = await fetch('http://localhost:3000/google-sync/cred-check');
    const credStatus = await credResponse.json();
    
    if (credStatus.status === 'success') {
      console.log('✅ Google credentials loaded successfully');
      console.log(`   - Type: ${credStatus.credentials.type}`);
      console.log(`   - Project ID: ${credStatus.credentials.project_id}`);
      console.log(`   - Client Email: ${credStatus.credentials.client_email}`);
    } else {
      console.log('❌ Google credentials not loaded');
      console.log(`   - Error: ${credStatus.message}`);
    }
    
    // Test 3: Try manual sync with a valid agent
    if (diagnostics.agentStats && diagnostics.agentStats.length > 0) {
      const testAgentId = diagnostics.agentStats[0]._id;
      console.log(`\n3. Testing manual sync for agent: ${testAgentId}...`);
      
      try {
        const syncResponse = await fetch(`http://localhost:3000/summary4/sync-google/${testAgentId}`, {
          method: 'POST'
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('✅ Manual sync successful');
          console.log(`   - Message: ${syncResult.message}`);
          console.log(`   - Records synced: ${syncResult.recordCount || 'N/A'}`);
        } else {
          const error = await syncResponse.text();
          console.log('❌ Manual sync failed');
          console.log(`   - Error: ${error}`);
        }
      } catch (error) {
        console.log('❌ Manual sync error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

test();