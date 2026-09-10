const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;

async function query(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v21.0${path}${path.includes('?') ? '&' : '?'}access_token=${token}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\nGET ${path} -> [${res.statusCode}]`);
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

async function main() {
  await query('/app');
  await query('/me/accounts');
  await query('/1325407630657336');
}

main();
