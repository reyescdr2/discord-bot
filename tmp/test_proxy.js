
const axios = require('axios');

async function testProxy(url) {
    const proxy = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=-1`;
    console.log(`Testing Proxy for: ${url}`);
    console.log(`Proxy URL: ${proxy}`);
    
    try {
        const resp = await axios.get(proxy, { timeout: 5000 });
        console.log(`✅ Success! Status: ${resp.status}`);
        console.log(`Content-Type: ${resp.headers['content-type']}`);
    } catch (e) {
        console.error(`❌ Proxy Error: ${e.message}`);
    }
}

// Test with a Rule34 GIF (Example)
testProxy('https://api-cdn.rule34.xxx/images/11186/74ae44e8bc261c6b3017cf46fd998f8e.gif');
