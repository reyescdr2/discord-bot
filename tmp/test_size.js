const axios = require('axios');

async function getFileSize(url) {
    try {
        const res = await axios.head(url, { 
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return parseInt(res.headers['content-length'] || 0);
    } catch (e) {
        console.error('Error fetching head:', e.message);
        return 0;
    }
}

const testUrls = [
    'https://api.rule34.xxx/images/11181/fc9535359196b014f3478fa6f3325c34.jpeg',
    'https://wimg.rule34.xxx/thumbnails/11181/thumbnail_fc9535359196b014f3478fa6f3325c34.jpg'
];

(async () => {
    for (const url of testUrls) {
        const size = await getFileSize(url);
        console.log(`URL: ${url}`);
        console.log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB (${size} bytes)`);
        console.log('---');
    }
})();
