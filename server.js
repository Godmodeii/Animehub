// Save this as server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/', createProxyMiddleware({ 
    target: 'https://animeheaven.me', // Target website
    changeOrigin: true,
    pathRewrite: {
        '^/': '/', // Rewrite path if needed
    },
    onProxyReq: (proxyReq, req, res) => {
        // Optional: add custom headers
    }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});