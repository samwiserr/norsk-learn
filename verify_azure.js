const https = require('https');

const key = "Foq3t0slKTrgbI3RV8Djc224eqGMh18yMADlRu3YSWh2ct3rWvydJQQJ99CAAC5RqLJXJ3w3AAAYACOGrOXU";
const region = "westeurope";

const options = {
    hostname: `${region}.api.cognitive.microsoft.com`,
    path: '/sts/v1.0/issueToken',
    method: 'POST',
    headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

console.log(`Testing Azure Key: ${key.substring(0, 10)}... in region ${region}`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("SUCCESS: Token generated.");
            console.log("Token length:", data.length);
        } else {
            console.log("FAILURE: " + data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
