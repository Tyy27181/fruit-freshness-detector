/**
 * WebSocket 连接管理模块
 * 负责 WebSocket 连接的创建、维护和消息处理
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.clientId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // 事件回调
        this.onConnected = null;
        this.onDisconnected = null;
        this.onMessage = null;
        this.onError = null;
    }

    /**
     * 连接到 WebSocket 服务器
     * @param {string} urlOrHost - 完整URL或服务器地址
     * @param {number|null} port - 服务器端口（可选）
     * @returns {Promise<boolean>} 连接是否成功
     */
    connect(urlOrHost, port) {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                reject(new Error('已经连接到服务器'));
                return;
            }

            // 判断是否为完整URL（以ws://或wss://开头）
            let url;
            if (urlOrHost.startsWith('ws://') || urlOrHost.startsWith('wss://')) {
                url = urlOrHost;
            } else if (port) {
                url = `ws://${urlOrHost}:${port}`;
            } else {
                url = `ws://${urlOrHost}`;
            }

            try {
                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;

                    if (this.onConnected) {
                        this.onConnected({ host: urlOrHost, port, url });
                    }

                    resolve(true);
                };

                this.socket.onclose = (event) => {
                    this.isConnected = false;
                    this.clientId = null;

                    if (this.onDisconnected) {
                        this.onDisconnected({
                            code: event.code,
                            reason: event.reason,
                            wasClean: event.wasClean
                        });
                    }
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.socket.onerror = (error) => {
                    if (this.onError) {
                        this.onError(error);
                    }

                    if (!this.isConnected) {
                        reject(new Error('连接失败'));
                    }
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket && this.isConnected) {
            this.socket.close(1000, '用户主动断开');
        }
    }

    /**
     * 发送消息
     * @param {string|object} message - 要发送的消息
     * @returns {boolean} 是否发送成功
     */
    send(message) {
        if (!this.isConnected || !this.socket) {
            return false;
        }

        try {
            const data = typeof message === 'object'
                ? JSON.stringify(message)
                : message;

            this.socket.send(data);
            return true;
        } catch (error) {
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    /**
     * 处理接收到的消息
     * @param {string} data - 接收到的数据
     */
    handleMessage(data) {
        let message;

        try {
            message = JSON.parse(data);
        } catch (e) {
            message = { type: 'raw', content: data };
        }

        // 处理系统消息
        if (message.type === 'system') {
            if (message.action === 'connected' && message.clientId) {
                this.clientId = message.clientId;
            }
        }

        if (this.onMessage) {
            this.onMessage(message);
        }
    }

    /**
     * 获取连接状态
     * @returns {boolean}
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * 获取客户端 ID
     * @returns {number|null}
     */
    getClientId() {
        return this.clientId;
    }
}

// 导出全局实例
window.wsClient = new WebSocketClient();
