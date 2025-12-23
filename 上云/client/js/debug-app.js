/**
 * 应用主逻辑
 * 处理 UI 交互和事件绑定
 */

(function() {
    'use strict';

    // 应用状态
    const appState = {
        sentCount: 0,
        receivedCount: 0,
        onlineCount: 0,
        logCount: 0,
        connectTime: null,
        uptimeInterval: null,
        settings: {
            darkMode: true,
            showTimestamp: true,
            autoScroll: true,
            autoReconnect: false
        }
    };

    // DOM 元素
    const elements = {
        // 导航
        navItems: document.querySelectorAll('.nav-item'),
        panels: document.querySelectorAll('.panel'),
        pageTitle: document.querySelector('.page-title'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.querySelector('.sidebar'),

        // 连接
        serverHost: document.getElementById('serverHost'),
        serverPort: document.getElementById('serverPort'),
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),
        connectionStatus: document.getElementById('connectionStatus'),

        // 快速操作
        quickConnect: document.getElementById('quickConnect'),
        quickDisconnect: document.getElementById('quickDisconnect'),
        clearLogs: document.getElementById('clearLogs'),

        // 消息
        messageLog: document.getElementById('messageLog'),
        dashboardLog: document.getElementById('dashboardLog'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        scrollToBottom: document.getElementById('scrollToBottom'),
        clearMessages: document.getElementById('clearMessages'),

        // 统计
        statStatus: document.getElementById('statStatus'),
        statSent: document.getElementById('statSent'),
        statReceived: document.getElementById('statReceived'),
        statOnline: document.getElementById('statOnline'),
        logCount: document.getElementById('logCount'),

        // 连接信息
        infoStatus: document.getElementById('infoStatus'),
        infoServer: document.getElementById('infoServer'),
        infoClientId: document.getElementById('infoClientId'),
        infoConnectTime: document.getElementById('infoConnectTime'),
        infoUptime: document.getElementById('infoUptime'),

        // 时间
        currentTime: document.getElementById('currentTime'),

        // 设置
        darkModeToggle: document.getElementById('darkModeToggle'),
        timestampToggle: document.getElementById('timestampToggle'),
        autoScrollToggle: document.getElementById('autoScrollToggle'),
        autoReconnectToggle: document.getElementById('autoReconnectToggle'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };

    // ===== 工具函数 =====

    /**
     * 格式化时间
     */
    function formatTime(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * 格式化日期时间
     */
    function formatDateTime(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * 格式化时长
     */
    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}小时 ${m}分 ${s}秒`;
        } else if (m > 0) {
            return `${m}分 ${s}秒`;
        }
        return `${s}秒`;
    }

    /**
     * HTML 转义
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Toast 通知系统 =====

    /**
     * 显示 Toast 通知
     */
    function showToast(title, message, type = 'info', duration = 3000) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${escapeHtml(title)}</div>
                ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        elements.toastContainer.appendChild(toast);

        // 关闭按钮
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        // 自动移除
        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }
    }

    /**
     * 移除 Toast
     */
    function removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }

    // ===== 消息日志 =====

    /**
     * 添加消息到日志
     */
    function addLogMessage(content, type = 'system', timestamp = null) {
        const time = formatTime(timestamp || new Date());

        // 创建消息元素
        const createMessageElement = () => {
            const messageItem = document.createElement('div');
            messageItem.className = `message-item ${type}`;

            const timeSpan = appState.settings.showTimestamp
                ? `<span class="time">[${time}]</span>`
                : '';

            messageItem.innerHTML = `${timeSpan}<span class="content">${escapeHtml(content)}</span>`;
            return messageItem;
        };

        // 添加到主消息日志
        if (elements.messageLog) {
            elements.messageLog.appendChild(createMessageElement());
            if (appState.settings.autoScroll) {
                elements.messageLog.scrollTop = elements.messageLog.scrollHeight;
            }
        }

        // 添加到仪表盘日志
        if (elements.dashboardLog) {
            const clone = createMessageElement();
            elements.dashboardLog.appendChild(clone);
            elements.dashboardLog.scrollTop = elements.dashboardLog.scrollHeight;

            // 限制仪表盘日志数量
            while (elements.dashboardLog.children.length > 50) {
                elements.dashboardLog.removeChild(elements.dashboardLog.firstChild);
            }
        }

        // 更新日志计数
        appState.logCount++;
        updateLogCount();
    }

    /**
     * 清空消息日志
     */
    function clearMessages() {
        if (elements.messageLog) {
            elements.messageLog.innerHTML = '';
        }
        if (elements.dashboardLog) {
            elements.dashboardLog.innerHTML = '';
        }
        appState.logCount = 0;
        updateLogCount();
        showToast('已清空', '消息日志已清空', 'success');
    }

    /**
     * 更新日志计数
     */
    function updateLogCount() {
        if (elements.logCount) {
            elements.logCount.textContent = `${appState.logCount} 条`;
        }
    }

    // ===== 统计更新 =====

    /**
     * 更新统计信息
     */
    function updateStats() {
        if (elements.statSent) {
            elements.statSent.textContent = appState.sentCount;
        }
        if (elements.statReceived) {
            elements.statReceived.textContent = appState.receivedCount;
        }
        if (elements.statOnline) {
            elements.statOnline.textContent = appState.onlineCount;
        }
    }

    /**
     * 更新连接状态显示
     */
    function updateConnectionStatus(connected) {
        if (elements.statStatus) {
            elements.statStatus.textContent = connected ? '在线' : '离线';
        }
        if (elements.infoStatus) {
            elements.infoStatus.innerHTML = connected
                ? '<span class="status-badge online">已连接</span>'
                : '<span class="status-badge offline">未连接</span>';
        }
    }

    // ===== 连接管理 =====

    /**
     * 更新连接状态 UI
     */
    function updateConnectionUI(connected) {
        if (connected) {
            elements.connectionStatus.classList.add('connected');
            elements.connectionStatus.querySelector('.status-text').textContent = '已连接';

            if (elements.connectBtn) elements.connectBtn.disabled = true;
            if (elements.disconnectBtn) elements.disconnectBtn.disabled = false;
            if (elements.quickConnect) elements.quickConnect.disabled = true;
            if (elements.quickDisconnect) elements.quickDisconnect.disabled = false;
            if (elements.messageInput) elements.messageInput.disabled = false;
            if (elements.sendBtn) elements.sendBtn.disabled = false;
            if (elements.serverHost) elements.serverHost.disabled = true;
            if (elements.serverPort) elements.serverPort.disabled = true;

            // 记录连接时间
            appState.connectTime = new Date();
            startUptimeTimer();

        } else {
            elements.connectionStatus.classList.remove('connected');
            elements.connectionStatus.querySelector('.status-text').textContent = '未连接';

            if (elements.connectBtn) elements.connectBtn.disabled = false;
            if (elements.disconnectBtn) elements.disconnectBtn.disabled = true;
            if (elements.quickConnect) elements.quickConnect.disabled = false;
            if (elements.quickDisconnect) elements.quickDisconnect.disabled = true;
            if (elements.messageInput) elements.messageInput.disabled = true;
            if (elements.sendBtn) elements.sendBtn.disabled = true;
            if (elements.serverHost) elements.serverHost.disabled = false;
            if (elements.serverPort) elements.serverPort.disabled = false;

            // 停止计时
            stopUptimeTimer();
            resetConnectionInfo();
        }

        updateConnectionStatus(connected);
    }

    /**
     * 显示连接信息
     */
    function showConnectionInfo(info) {
        if (elements.infoServer) {
            elements.infoServer.textContent = info.url;
        }
        if (elements.infoClientId) {
            elements.infoClientId.textContent = info.clientId || '获取中...';
        }
        if (elements.infoConnectTime) {
            elements.infoConnectTime.textContent = formatDateTime(appState.connectTime);
        }
    }

    /**
     * 重置连接信息
     */
    function resetConnectionInfo() {
        if (elements.infoServer) elements.infoServer.textContent = '-';
        if (elements.infoClientId) elements.infoClientId.textContent = '-';
        if (elements.infoConnectTime) elements.infoConnectTime.textContent = '-';
        if (elements.infoUptime) elements.infoUptime.textContent = '-';
        appState.onlineCount = 0;
        updateStats();
    }

    /**
     * 启动在线时长计时器
     */
    function startUptimeTimer() {
        stopUptimeTimer();
        appState.uptimeInterval = setInterval(() => {
            if (appState.connectTime && elements.infoUptime) {
                const seconds = Math.floor((Date.now() - appState.connectTime.getTime()) / 1000);
                elements.infoUptime.textContent = formatDuration(seconds);
            }
        }, 1000);
    }

    /**
     * 停止在线时长计时器
     */
    function stopUptimeTimer() {
        if (appState.uptimeInterval) {
            clearInterval(appState.uptimeInterval);
            appState.uptimeInterval = null;
        }
    }

    /**
     * 连接到服务器
     */
    async function connect() {
        const host = elements.serverHost.value.trim() || 'localhost';
        const portValue = elements.serverPort.value.trim();
        const port = portValue ? parseInt(portValue) : null;

        // 判断是否为完整URL
        let displayUrl;
        if (host.startsWith('ws://') || host.startsWith('wss://')) {
            displayUrl = host;
        } else if (port) {
            displayUrl = `ws://${host}:${port}`;
        } else {
            displayUrl = `ws://${host}`;
        }

        addLogMessage(`正在连接到 ${displayUrl}...`, 'system');

        try {
            await wsClient.connect(host, port);
        } catch (error) {
            addLogMessage(`连接失败: ${error.message}`, 'error');
            showToast('连接失败', error.message, 'error');
        }
    }

    /**
     * 断开连接
     */
    function disconnect() {
        wsClient.disconnect();
    }

    /**
     * 发送消息
     */
    function sendMessage() {
        const message = elements.messageInput.value.trim();

        if (!message) {
            return;
        }

        if (wsClient.send(message)) {
            addLogMessage(`[发送] ${message}`, 'sent');
            elements.messageInput.value = '';
            appState.sentCount++;
            updateStats();
        } else {
            addLogMessage('发送失败，请检查连接状态', 'error');
            showToast('发送失败', '请检查连接状态', 'error');
        }
    }

    // ===== WebSocket 事件处理 =====

    /**
     * 初始化 WebSocket 事件监听
     */
    function initWebSocketEvents() {
        wsClient.onConnected = (info) => {
            updateConnectionUI(true);
            addLogMessage(`已连接到 ${info.url}`, 'system');
            showConnectionInfo(info);
            showToast('连接成功', `已连接到 ${info.url}`, 'success');
        };

        wsClient.onDisconnected = (info) => {
            updateConnectionUI(false);
            addLogMessage(`连接已断开 (代码: ${info.code})`, 'system');
            showToast('连接断开', `代码: ${info.code}`, 'warning');
        };

        wsClient.onMessage = (message) => {
            handleIncomingMessage(message);
        };

        wsClient.onError = (error) => {
            addLogMessage(`错误: ${error.message || '未知错误'}`, 'error');
            showToast('错误', error.message || '未知错误', 'error');
        };
    }

    /**
     * 处理接收到的消息
     */
    function handleIncomingMessage(message) {
        const timestamp = message.timestamp;

        switch (message.type) {
            case 'system':
                handleSystemMessage(message, timestamp);
                break;

            case 'forward':
                handleForwardMessage(message, timestamp);
                break;

            default:
                addLogMessage(`[未知消息] ${JSON.stringify(message)}`, 'received', timestamp);
                appState.receivedCount++;
                updateStats();
        }
    }

    /**
     * 处理系统消息
     */
    function handleSystemMessage(message, timestamp) {
        switch (message.action) {
            case 'connected':
                addLogMessage(`[系统] ${message.message}`, 'system', timestamp);
                const info = {
                    url: `ws://${elements.serverHost.value}:${elements.serverPort.value}`,
                    clientId: message.clientId
                };
                showConnectionInfo(info);
                break;

            case 'client_joined':
                appState.onlineCount = message.onlineCount;
                updateStats();
                addLogMessage(`[系统] 客户端 #${message.clientId} 加入，当前在线: ${message.onlineCount}`, 'system', timestamp);
                break;

            case 'client_left':
                appState.onlineCount = message.onlineCount;
                updateStats();
                addLogMessage(`[系统] 客户端 #${message.clientId} 离开，当前在线: ${message.onlineCount}`, 'system', timestamp);
                break;

            case 'message_sent':
                break;

            case 'server_shutdown':
                addLogMessage(`[系统] 服务器即将关闭`, 'error', timestamp);
                showToast('警告', '服务器即将关闭', 'warning');
                break;

            default:
                addLogMessage(`[系统] ${message.message || JSON.stringify(message)}`, 'system', timestamp);
        }
    }

    /**
     * 处理转发消息
     */
    function handleForwardMessage(message, timestamp) {
        const content = message.data.content || JSON.stringify(message.data);
        addLogMessage(`[来自 #${message.from}] ${content}`, 'received', timestamp);
        appState.receivedCount++;
        updateStats();
    }

    // ===== 导航系统 =====

    /**
     * 切换面板
     */
    function switchPanel(panelName) {
        const panelMap = {
            'dashboard': 'dashboardPanel',
            'connection': 'connectionPanel',
            'messages': 'messagesPanel',
            'settings': 'settingsPanel'
        };

        const titleMap = {
            'dashboard': '仪表盘',
            'connection': '连接管理',
            'messages': '消息中心',
            'settings': '系统设置'
        };

        // 更新导航状态
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.panel === panelName);
        });

        // 切换面板
        elements.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === panelMap[panelName]);
        });

        // 更新标题
        if (elements.pageTitle) {
            elements.pageTitle.textContent = titleMap[panelName];
        }

        // 移动端关闭侧边栏
        if (window.innerWidth <= 1024) {
            elements.sidebar.classList.remove('open');
        }
    }

    // ===== 设置 =====

    /**
     * 切换深色模式
     */
    function toggleDarkMode(enabled) {
        appState.settings.darkMode = enabled;
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
        localStorage.setItem('darkMode', enabled);
    }

    /**
     * 加载设置
     */
    function loadSettings() {
        // 深色模式
        const darkMode = localStorage.getItem('darkMode');
        if (darkMode !== null) {
            appState.settings.darkMode = darkMode === 'true';
        }
        if (elements.darkModeToggle) {
            elements.darkModeToggle.checked = appState.settings.darkMode;
        }
        toggleDarkMode(appState.settings.darkMode);

        // 时间戳
        const timestamp = localStorage.getItem('showTimestamp');
        if (timestamp !== null) {
            appState.settings.showTimestamp = timestamp === 'true';
        }
        if (elements.timestampToggle) {
            elements.timestampToggle.checked = appState.settings.showTimestamp;
        }

        // 自动滚动
        const autoScroll = localStorage.getItem('autoScroll');
        if (autoScroll !== null) {
            appState.settings.autoScroll = autoScroll === 'true';
        }
        if (elements.autoScrollToggle) {
            elements.autoScrollToggle.checked = appState.settings.autoScroll;
        }

        // 自动重连
        const autoReconnect = localStorage.getItem('autoReconnect');
        if (autoReconnect !== null) {
            appState.settings.autoReconnect = autoReconnect === 'true';
        }
        if (elements.autoReconnectToggle) {
            elements.autoReconnectToggle.checked = appState.settings.autoReconnect;
        }
    }

    // ===== 时钟 =====

    /**
     * 更新当前时间
     */
    function updateCurrentTime() {
        if (elements.currentTime) {
            const now = new Date();
            elements.currentTime.textContent = now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    // ===== 事件绑定 =====

    /**
     * 初始化 UI 事件监听
     */
    function initUIEvents() {
        // 导航点击
        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPanel(item.dataset.panel);
            });
        });

        // 菜单切换
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', () => {
                elements.sidebar.classList.toggle('open');
            });
        }

        // 连接按钮
        if (elements.connectBtn) {
            elements.connectBtn.addEventListener('click', connect);
        }
        if (elements.quickConnect) {
            elements.quickConnect.addEventListener('click', connect);
        }

        // 断开按钮
        if (elements.disconnectBtn) {
            elements.disconnectBtn.addEventListener('click', disconnect);
        }
        if (elements.quickDisconnect) {
            elements.quickDisconnect.addEventListener('click', disconnect);
        }

        // 清空日志
        if (elements.clearLogs) {
            elements.clearLogs.addEventListener('click', clearMessages);
        }
        if (elements.clearMessages) {
            elements.clearMessages.addEventListener('click', clearMessages);
        }

        // 发送消息
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', sendMessage);
        }
        if (elements.messageInput) {
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        // 滚动到底部
        if (elements.scrollToBottom) {
            elements.scrollToBottom.addEventListener('click', () => {
                if (elements.messageLog) {
                    elements.messageLog.scrollTop = elements.messageLog.scrollHeight;
                }
            });
        }

        // 端口输入验证
        if (elements.serverPort) {
            elements.serverPort.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (value < 1) e.target.value = 1;
                if (value > 65535) e.target.value = 65535;
            });
        }

        // 设置开关
        if (elements.darkModeToggle) {
            elements.darkModeToggle.addEventListener('change', (e) => {
                toggleDarkMode(e.target.checked);
            });
        }
        if (elements.timestampToggle) {
            elements.timestampToggle.addEventListener('change', (e) => {
                appState.settings.showTimestamp = e.target.checked;
                localStorage.setItem('showTimestamp', e.target.checked);
            });
        }
        if (elements.autoScrollToggle) {
            elements.autoScrollToggle.addEventListener('change', (e) => {
                appState.settings.autoScroll = e.target.checked;
                localStorage.setItem('autoScroll', e.target.checked);
            });
        }
        if (elements.autoReconnectToggle) {
            elements.autoReconnectToggle.addEventListener('change', (e) => {
                appState.settings.autoReconnect = e.target.checked;
                localStorage.setItem('autoReconnect', e.target.checked);
            });
        }

        // 点击遮罩关闭侧边栏
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 &&
                elements.sidebar.classList.contains('open') &&
                !elements.sidebar.contains(e.target) &&
                !elements.menuToggle.contains(e.target)) {
                elements.sidebar.classList.remove('open');
            }
        });
    }

    // ===== 初始化 =====

    /**
     * 初始化应用
     */
    function init() {
        loadSettings();
        initWebSocketEvents();
        initUIEvents();

        // 启动时钟
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);

        // 初始化消息
        addLogMessage('系统就绪，请配置服务器地址并连接', 'system');

        // 更新初始状态
        updateStats();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
