/**
 * 智能终端管理系统 - Web 静态文件服务器
 * 用于部署前端页面
 */

const express = require('express');
const path = require('path');

const app = express();

// 默认配置
const DEFAULT_PORT = 3000;
const port = process.argv[2] || DEFAULT_PORT;

// 静态文件目录指向 client 文件夹
const clientPath = path.join(__dirname, '..', 'client');

// 提供静态文件服务
app.use(express.static(clientPath));

// 根路径返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// 启动服务器
app.listen(port, () => {
    console.log(`[Web服务器] 已启动`);
    console.log(`[Web服务器] 前端地址: http://127.0.0.1:${port}`);
    console.log(`[Web服务器] 静态文件目录: ${clientPath}`);
});
