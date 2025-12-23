/**
 * 智能终端管理系统 - 统一服务器
 * 功能：Web 静态文件服务 + WebSocket 服务
 * 端口：8080
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// 默认配置
const DEFAULT_PORT = 8080;
const port = process.argv[2] || DEFAULT_PORT;

// 创建 Express 应用
const app = express();

// 静态文件目录指向 client 文件夹
const clientPath = path.join(__dirname, '..', 'client');

// 提供静态文件服务
app.use(express.static(clientPath));

// 根路径返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器，附加到 HTTP 服务器
const wss = new WebSocket.Server({ server });

// 存储所有连接的客户端
const clients = new Map();
let clientIdCounter = 0;

/**
 * 将字符串中的非 ASCII 字符转换为 Unicode 转义
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function toUnicodeEscape(str) {
    return str.replace(/[\u0080-\uffff]/g, (char) => {
        return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    });
}

/**
 * 安全的 JSON 序列化（确保非 ASCII 字符被转义）
 * @param {object} obj - 要序列化的对象
 * @returns {string} JSON 字符串
 */
function safeJsonStringify(obj) {
    return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, (char) => {
        return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    });
}

/**
 * 广播消息给所有客户端（除了发送者）
 * @param {string} message - 要广播的消息
 * @param {WebSocket} sender - 发送者（可选，排除发送者）
 */
function broadcast(message, sender = null) {
    clients.forEach((clientInfo, client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (e) {
                console.error(`[广播错误] 发送给客户端 #${clientInfo.id} 失败: ${e.message}`);
            }
        }
    });
}

/**
 * 广播消息给所有客户端（包括发送者）
 * @param {string} message - 要广播的消息
 */
function broadcastToAll(message) {
    clients.forEach((clientInfo, client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (e) {
                console.error(`[广播错误] 发送给客户端 #${clientInfo.id} 失败: ${e.message}`);
            }
        }
    });
}

/**
 * 获取或创建客户端信息
 */
function getOrCreateClientInfo(ws, req) {
    let clientInfo = clients.get(ws);

    if (!clientInfo) {
        const clientId = ++clientIdCounter;
        const clientIp = req ? req.socket.remoteAddress : '未知';

        clientInfo = {
            id: clientId,
            ip: clientIp,
            connectedAt: new Date().toISOString()
        };

        clients.set(ws, clientInfo);
        console.log(`[自动注册] 客户端 #${clientId} (IP: ${clientIp})，当前在线: ${clients.size}`);
    }

    return clientInfo;
}

// 处理新连接
wss.on('connection', (ws, req) => {
    const clientId = ++clientIdCounter;
    const clientIp = req.socket.remoteAddress;

    // 存储客户端信息
    const clientInfo = {
        id: clientId,
        ip: clientIp,
        connectedAt: new Date().toISOString()
    };
    clients.set(ws, clientInfo);

    console.log(`[连接] 客户端 #${clientId} 已连接 (IP: ${clientIp})，当前在线: ${clients.size}`);

    // 发送欢迎消息
    try {
        ws.send(safeJsonStringify({
            type: 'system',
            action: 'connected',
            clientId: clientId,
            message: `connected, clientId: ${clientId}`,
            onlineCount: clients.size,
            timestamp: new Date().toISOString()
        }));
    } catch (e) {
        console.error(`[错误] 发送欢迎消息失败: ${e.message}`);
    }

    // 通知其他客户端有新用户加入
    broadcast(safeJsonStringify({
        type: 'system',
        action: 'client_joined',
        clientId: clientId,
        onlineCount: clients.size,
        timestamp: new Date().toISOString()
    }), ws);

    // 处理接收到的消息
    ws.on('message', (data) => {
        // 确保客户端信息存在
        const info = clients.get(ws) || clientInfo;
        const messageStr = data.toString();

        console.log(`[消息] 来自客户端 #${info.id}: ${messageStr}，当前在线: ${clients.size}`);

        // 尝试解析 JSON 消息
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(messageStr);
        } catch (e) {
            // 如果不是 JSON，包装成标准格式
            parsedMessage = {
                type: 'text',
                content: messageStr
            };
        }

        // 构建转发消息
        const forwardMessage = safeJsonStringify({
            type: 'forward',
            from: info.id,
            fromIp: info.ip,
            data: parsedMessage,
            timestamp: new Date().toISOString()
        });

        // 转发给所有其他客户端
        broadcast(forwardMessage, ws);

        // 给发送者确认（可选，传感器可能不需要）
        try {
            ws.send(safeJsonStringify({
                type: 'system',
                action: 'message_sent',
                message: 'message_sent',
                recipientCount: clients.size - 1,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            // 忽略发送确认失败
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        const info = clients.get(ws);
        if (info) {
            clients.delete(ws);
            console.log(`[断开] 客户端 #${info.id} 已断开，当前在线: ${clients.size}`);

            // 通知其他客户端
            broadcast(safeJsonStringify({
                type: 'system',
                action: 'client_left',
                clientId: info.id,
                onlineCount: clients.size,
                timestamp: new Date().toISOString()
            }));
        }
    });

    // 处理错误
    ws.on('error', (error) => {
        const info = clients.get(ws);
        console.error(`[错误] 客户端 #${info?.id || '未知'}: ${error.message}`);
    });
});

// 处理服务器错误
wss.on('error', (error) => {
    console.error(`[服务器错误] ${error.message}`);
});

// 启动服务器
server.listen(port, () => {
    console.log(`[服务器] 已启动，端口: ${port}`);
    console.log(`[服务器] 网页地址: http://127.0.0.1:${port}`);
    console.log(`[服务器] WebSocket: ws://127.0.0.1:${port}`);
    console.log(`[服务器] 等待客户端连接...`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n[服务器] 正在关闭...');

    // 通知所有客户端服务器即将关闭
    broadcastToAll(safeJsonStringify({
        type: 'system',
        action: 'server_shutdown',
        message: 'server_shutdown',
        timestamp: new Date().toISOString()
    }));

    server.close(() => {
        console.log('[服务器] 已关闭');
        process.exit(0);
    });
});
