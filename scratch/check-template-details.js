const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

// Check template details for 1546861813777267
const options = {
  hostname: 'graph.facebook.com',
  path: `/${version}/1546861813777267`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => {
    console.log('--- Template Details ---');
    console.log(resData);
  });
});

req.end();
