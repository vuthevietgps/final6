/**
 * Test script để kiểm tra Agent ID và Google Drive Link
 */
const { MongoClient } = require('mongodb');

async function testAgentLookup() {
  const mongoUrl = 'mongodb+srv://vuthevietgps:Aa159951159951@cluster0.cgdyq.mongodb.net/dongbodulieuweb?retryWrites=true&w=majority';
  
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('dongbodulieuweb');
    
    // 1. Check if agent ID exists
    const agentId = '6754a8bb7c39b1bbad84e19c';
    console.log('\n🔍 Checking agent ID:', agentId);
    
    const user = await db.collection('users').findOne({ _id: { $oid: agentId } });
    if (user) {
      console.log('✅ User found:');
      console.log('  - Name:', user.fullName);
      console.log('  - Email:', user.email);
      console.log('  - Type:', user.userType);
      console.log('  - Google Drive Link:', user.googleDriveLink || 'NOT SET');
    } else {
      console.log('❌ User not found');
    }
    
    // 2. Find users with Google Drive Link
    console.log('\n🔍 Finding users with Google Drive Link:');
    const usersWithGoogleDrive = await db.collection('users')
      .find({ 
        googleDriveLink: { $exists: true, $ne: null, $ne: '' },
        userType: { $in: ['Internal Agent', 'External Agent'] }
      })
      .limit(5)
      .toArray();
      
    if (usersWithGoogleDrive.length > 0) {
      console.log(`✅ Found ${usersWithGoogleDrive.length} users with Google Drive Link:`);
      usersWithGoogleDrive.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.fullName} (${user._id})`);
        console.log(`     Type: ${user.userType}`);
        console.log(`     Google Drive: ${user.googleDriveLink}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found with Google Drive Link');
    }
    
    // 3. Check Summary4 records
    console.log('\n🔍 Checking Summary4 records:');
    const summary4Count = await db.collection('summary4').countDocuments();
    console.log(`Total Summary4 records: ${summary4Count}`);
    
    if (summary4Count > 0) {
      const agentSummary4 = await db.collection('summary4')
        .find({ agentId: { $oid: agentId } })
        .limit(3)
        .toArray();
      console.log(`Summary4 records for agent ${agentId}: ${agentSummary4.length}`);
      
      if (agentSummary4.length > 0) {
        console.log('Sample records:');
        agentSummary4.forEach((record, index) => {
          console.log(`  ${index + 1}. Customer: ${record.customerName}`);
          console.log(`     Product: ${record.product}`);
          console.log(`     Date: ${record.orderDate}`);
        });
      }
    }
    
    await client.close();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAgentLookup();