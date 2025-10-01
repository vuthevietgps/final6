/**
 * Test script để debug AI auto reply functionality
 */

const https = require('http');

// Sample webhook payload from Facebook Messenger
const testPayload = {
  object: 'page',
  entry: [
    {
      id: '123456789',
      time: Date.now(),
      messaging: [
        {
          sender: {
            id: '24776034528751852' // PSID từ hình ảnh
          },
          recipient: {
            id: '123456789' // Page ID
          },
          timestamp: Date.now(),
          message: {
            mid: 'test_message_id',
            text: 'yinhf hinh thế nào' // Text từ hình ảnh
          }
        }
      ]
    }
  ]
};

// Gửi webhook test đến server
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/webhook/messenger',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': JSON.stringify(testPayload).length
  }
};

console.log('Sending test webhook...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(JSON.stringify(testPayload));
req.end();