const axios = require('axios');

async function getFileSize(url) {
    try {
        console.log(`Checking size for: ${url}`);
        const res = await axios.get(url, { 
            headers: { 
                'Range': 'bytes=0-0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
            },
            timeout: 5000 
        });
        
        const contentRange = res.headers['content-range'];
        const contentLength = res.headers['content-length'];
        
        console.log(`Headers received: Range=${contentRange}, Length=${contentLength}, Status=${res.status}`);
        
        if (contentRange) {
            return parseInt(contentRange.split('/')[1] || 0);
        }
        return parseInt(contentLength || 0);
    } catch (e) {
        console.error(`Error in getFileSize: ${e.message}`);
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error(`Headers:`, e.response.headers);
        }
        return 0;
    }
}

// Fetch a live URL first
async function run() {
    try {
        const list = await axios.get('https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=5', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const url = list.data[0].file_url;
        const size = await getFileSize(url);
        console.log(`Final Size: ${size} bytes (${(size/1024/1024).toFixed(2)} MB)`);
    } catch (e) {
        console.error(`Top level error: ${e.message}`);
    }
}

run();
