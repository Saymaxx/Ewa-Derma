const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

console.log('Testing WhatsApp Meta API with:');
console.log('Phone ID:', phoneId);
console.log('Token length:', token ? token.length : 0);
console.log('API Version:', version);

// Let's first test getting the phone number details from Meta Graph API
const options = {
  hostname: 'graph.facebook.com',
  path: `/${version}/${phoneId}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('\n--- Phone Number Details Response (Status: ' + res.statusCode + ') ---');
    console.log(data);
    
    // Now let's test checking message templates
    checkTemplates();
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});
req.end();

function checkTemplates() {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  console.log('\nChecking Message Templates for WABA ID:', wabaId);
  const tplOptions = {
    hostname: 'graph.facebook.com',
    path: `/${version}/${wabaId}/message_templates`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const tplReq = https.request(tplOptions, (res) => {
    let tplData = '';
    res.on('data', (chunk) => tplData += chunk);
    res.on('end', () => {
      console.log('\n--- Message Templates Response (Status: ' + res.statusCode + ') ---');
      console.log(tplData);
    });
  });

  tplReq.on('error', (e) => console.error('Template request error:', e));
  tplReq.end();
}
