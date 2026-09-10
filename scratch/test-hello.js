const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

const targetNumber = process.argv[2] || '919120854977';

const payload = {
  messaging_product: 'whatsapp',
  to: targetNumber,
  type: 'template',
  template: {
    name: 'hello_world',
    language: { code: 'en_US' }
  }
};

const data = JSON.stringify(payload);
const options = {
  hostname: 'graph.facebook.com',
  path: `/${version}/${phoneId}/messages`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => {
    console.log(`[Status: ${res.statusCode}]`);
    console.log(resData);
  });
});

req.on('error', console.error);
req.write(data);
req.end();
