const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;

// Inspect token with /me and /debug_token
const options = {
  hostname: 'graph.facebook.com',
  path: `/v21.0/me?access_token=${token}`,
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('--- /me Response (Status: ' + res.statusCode + ') ---');
    console.log(data);
    
    // Check permissions
    checkPermissions();
  });
});
req.end();

function checkPermissions() {
  const permOptions = {
    hostname: 'graph.facebook.com',
    path: `/v21.0/me/permissions?access_token=${token}`,
    method: 'GET'
  };

  const permReq = https.request(permOptions, (res) => {
    let pData = '';
    res.on('data', (chunk) => pData += chunk);
    res.on('end', () => {
      console.log('\n--- /me/permissions Response (Status: ' + res.statusCode + ') ---');
      console.log(pData);
    });
  });
  permReq.end();
}
