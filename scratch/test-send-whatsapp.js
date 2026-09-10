const https = require('https');
require('dotenv').config({ path: 'c:/Projects/Ewa Derma Clinic/backend/.env' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

// Test dispatching template 'hello_world' and 'patient_registration_confirmation'
async function testSend(recipientNumber) {
  console.log(`\nTesting send to: ${recipientNumber}`);

  // Test 1: hello_world (Meta default template on sandbox)
  const helloPayload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  };

  await sendRequest(helloPayload, 'Template: hello_world');

  // Test 2: patient_registration_confirmation
  const regPayload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'template',
    template: {
      name: 'patient_registration_confirmation',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Rahul Sharma' },
            { type: 'text', text: 'P-1001' }
          ]
        }
      ]
    }
  };

  await sendRequest(regPayload, 'Template: patient_registration_confirmation');
}

function sendRequest(payload, label) {
  return new Promise((resolve) => {
    console.log(`\n[${label}] Sending payload:`, JSON.stringify(payload));
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
        console.log(`[${label}] HTTP Status:`, res.statusCode);
        console.log(`[${label}] Response:`, resData);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`[${label}] Request error:`, e);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

// Let's test with Indian numbers
const targetNumber = process.argv[2] || '919120854977';
testSend(targetNumber);
