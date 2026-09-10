const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;

async function check(path, label) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: `${path}${path.includes('?') ? '&' : '?'}access_token=${token}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n[${label}] (Status: ${res.statusCode})`);
        console.log(data);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(e);
      resolve();
    });
    req.end();
  });
}

async function run() {
  await check('/v21.0/122093746737483074?fields=id,name,whatsapp_business_accounts,businesses', 'System User Info');
  await check('/v21.0/1325407630657336?fields=id,verified_name,display_phone_number,whatsapp_business_account', 'Phone Number Details');
}

run();
