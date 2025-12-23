/**
 * 训练模式应用 - 数据采集功能
 */

(function() {
    'use strict';

    // ===== 状态管理 =====
    const appState = {
        connected: false,
        sensorData: {
            ethanol_adc: null,       // 乙醇传感器ADC值
            ethylene_voltage: null,  // 乙烯传感器电压值 (V)
            tvoc: null,
            hcho: null,
            co2: null,
            aqi: null,
            temperature: null,
            humidity: null
        }
    };

    // 采集状态
    const collectState = {
        selectedFruit: 'apple',
        selectedLabel: 'fresh',
        collectedData: [],
        // 自动采集状态
        autoCollecting: false,
        autoTimer: null,
        countdownTimer: null,
        autoCollectedCount: 0,
        autoTargetCount: 0
    };

    // 水果名称映射
    const FRUIT_NAMES = {
        apple: '苹果',
        banana: '香蕉',
        orange: '橙子',
        grape: '葡萄',
        strawberry: '草莓',
        mango: '芒果',
        tangerine: '小橘子'
    };

    // 标签名称映射
    const LABEL_NAMES = {
        unripe: '未成熟',
        ripe: '成熟',
        overripe: '过熟',
        fresh: '新鲜',
        not_fresh: '不新鲜'
    };

    // ===== DOM 元素 =====
    const elements = {
        // 导航
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.querySelector('.sidebar'),
        navItems: document.querySelectorAll('.nav-item'),
        panels: document.querySelectorAll('.panel'),
        pageTitle: document.querySelector('.page-title'),

        // 状态
        connectionStatus: document.getElementById('connectionStatus'),
        currentTime: document.getElementById('currentTime'),

        // 连接
        serverHost: document.getElementById('serverHost'),
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),

        // 采集
        recordDataBtn: document.getElementById('recordDataBtn'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        clearCollectBtn: document.getElementById('clearCollectBtn'),
        collectTableBody: document.getElementById('collectTableBody'),
        collectCount: document.getElementById('collectCount'),
        dataCountBadge: document.getElementById('dataCountBadge'),

        // 预览
        previewStatus: document.getElementById('previewStatus'),

        // 自动采集
        autoInterval: document.getElementById('autoInterval'),
        autoCount: document.getElementById('autoCount'),
        autoCollected: document.getElementById('autoCollected'),
        autoCountdown: document.getElementById('autoCountdown'),
        autoCollectStatus: document.getElementById('autoCollectStatus'),
        startAutoBtn: document.getElementById('startAutoBtn'),
        stopAutoBtn: document.getElementById('stopAutoBtn'),

        // Toast
        toastContainer: document.getElementById('toastContainer')
    };

    // ===== 工具函数 =====
    function showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        elements.toastContainer.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    function updateCurrentTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (elements.currentTime) {
            elements.currentTime.textContent = timeStr;
        }
    }

    // ===== WebSocket 处理 =====
    function initWebSocketEvents() {
        if (typeof wsClient === 'undefined') {
            console.error('wsClient 未定义');
            return;
        }

        wsClient.onConnected = function(info) {
            appState.connected = true;
            updateConnectionUI('connected');
            showToast('连接成功', '已连接到服务器', 'success');
        };

        wsClient.onDisconnected = function(info) {
            appState.connected = false;
            updateConnectionUI('disconnected');
            showToast('连接断开', '已断开服务器连接', 'warning');
        };

        wsClient.onMessage = function(data) {
            processMessage(data);
        };

        wsClient.onError = function(error) {
            updateConnectionUI('error');
            showToast('连接错误', '连接发生错误', 'error');
        };
    }

    function updateConnectionUI(status) {
        const statusDot = elements.connectionStatus?.querySelector('.status-dot');
        const statusText = elements.connectionStatus?.querySelector('.status-text');

        if (statusDot) {
            statusDot.className = 'status-dot';
            if (status === 'connected') {
                statusDot.classList.add('connected');
            } else if (status === 'connecting') {
                statusDot.classList.add('connecting');
            }
        }

        if (statusText) {
            const texts = {
                'connected': '传感器在线',
                'connecting': '连接中...',
                'disconnected': '传感器离线',
                'error': '连接错误'
            };
            statusText.textContent = texts[status] || '未知状态';
        }

        if (elements.connectBtn) {
            elements.connectBtn.disabled = (status === 'connected' || status === 'connecting');
        }
        if (elements.disconnectBtn) {
            elements.disconnectBtn.disabled = (status !== 'connected');
        }
    }

    function processMessage(data) {
        if (data.type === 'forward' && data.data) {
            const content = data.data.content || JSON.stringify(data.data);
            processSensorData(content);
        } else if (data.type === 'text') {
            processSensorData(data.content);
        }
    }

    function processSensorData(data) {
        if (typeof data !== 'string') return;

        // 乙醇ADC值: Ethanol: 61.53 ppm (ADC: 6153, Alarm: 0)
        const ethanolAdcMatch = data.match(/ADC:\s*(\d+)/i);
        if (ethanolAdcMatch) {
            appState.sensorData.ethanol_adc = parseInt(ethanolAdcMatch[1]);
        }

        // 乙烯传感器电压值: Vol:0.62V
        const ethyleneVoltageMatch = data.match(/Vol:\s*([\d.]+)\s*V/i);
        if (ethyleneVoltageMatch) {
            appState.sensorData.ethylene_voltage = parseFloat(ethyleneVoltageMatch[1]);
        }

        // 空气质量传感器数据
        const tvocMatch = data.match(/TVOC:\s*([\d.]+)\s*mg\/m3/i);
        if (tvocMatch) {
            appState.sensorData.tvoc = parseFloat(tvocMatch[1]);
        }

        const hchoMatch = data.match(/HCHO:\s*([\d.]+)\s*mg\/m3/i);
        if (hchoMatch) {
            appState.sensorData.hcho = parseFloat(hchoMatch[1]);
        }

        const co2Match = data.match(/CO2:\s*(\d+)\s*ppm/i);
        if (co2Match) {
            appState.sensorData.co2 = parseInt(co2Match[1]);
        }

        const aqiMatch = data.match(/AQI:\s*(\d+)/i);
        if (aqiMatch) {
            appState.sensorData.aqi = parseInt(aqiMatch[1]);
        }

        const tempMatch = data.match(/T:\s*([\d.]+)\s*C/i);
        if (tempMatch) {
            appState.sensorData.temperature = parseFloat(tempMatch[1]);
        }

        const humiMatch = data.match(/H:\s*([\d.]+)\s*%/i);
        if (humiMatch) {
            appState.sensorData.humidity = parseFloat(humiMatch[1]);
        }

        updateCollectPreview();
    }

    // ===== 数据采集功能 =====
    function updateCollectPreview() {
        const data = appState.sensorData;

        const setValue = (id, value, unit, decimals = 2) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value !== null ? `${value.toFixed(decimals)} ${unit}` : `-- ${unit}`;
            }
        };

        setValue('previewEthanol', data.ethanol_adc, '', 0);
        setValue('previewEthylene', data.ethylene_voltage, 'V');
        setValue('previewTvoc', data.tvoc, 'mg/m³', 3);
        setValue('previewHcho', data.hcho, 'mg/m³', 3);
        setValue('previewCo2', data.co2, 'ppm', 0);
        setValue('previewAqi', data.aqi, '', 0);
        setValue('previewTemp', data.temperature, '°C', 1);
        setValue('previewHumi', data.humidity, '%', 1);

        if (elements.previewStatus) {
            const hasData = data.ethanol_adc !== null || data.ethylene_voltage !== null || data.tvoc !== null;
            if (hasData) {
                elements.previewStatus.textContent = '数据就绪';
                elements.previewStatus.classList.add('active');
            } else {
                elements.previewStatus.textContent = '等待数据...';
                elements.previewStatus.classList.remove('active');
            }
        }
    }

    function recordCurrentData() {
        const data = appState.sensorData;
        const hasValidData = data.ethanol_adc !== null || data.ethylene_voltage !== null ||
                            data.tvoc !== null || data.co2 !== null;

        if (!hasValidData) {
            showToast('无法记录', '请先连接传感器获取数据', 'warning');
            return;
        }

        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            fruit_type: collectState.selectedFruit,
            maturity_label: collectState.selectedLabel,
            ethanol_adc: data.ethanol_adc,
            ethylene_voltage: data.ethylene_voltage,
            tvoc: data.tvoc,
            hcho: data.hcho,
            co2: data.co2,
            aqi: data.aqi,
            temperature: data.temperature,
            humidity: data.humidity
        };

        collectState.collectedData.push(record);
        saveCollectedData();
        updateCollectTable();
        updateCollectCount();
        updateStats();

        showToast('记录成功', `已记录 ${FRUIT_NAMES[record.fruit_type]} - ${LABEL_NAMES[record.maturity_label]}`, 'success');
    }

    function updateCollectTable() {
        const tbody = elements.collectTableBody;
        if (!tbody) return;

        if (collectState.collectedData.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="11">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>暂无采集数据，点击"记录当前数据"开始采集</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = collectState.collectedData.map((record, index) => {
            const time = new Date(record.timestamp).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            return `
                <tr data-id="${record.id}">
                    <td>${index + 1}</td>
                    <td>${time}</td>
                    <td>${FRUIT_NAMES[record.fruit_type] || record.fruit_type}</td>
                    <td><span class="label-tag ${record.maturity_label}">${LABEL_NAMES[record.maturity_label] || record.maturity_label}</span></td>
                    <td>${record.ethanol_adc !== null ? record.ethanol_adc : '--'}</td>
                    <td>${record.ethylene_voltage !== null ? record.ethylene_voltage.toFixed(2) : '--'}</td>
                    <td>${record.tvoc !== null ? record.tvoc.toFixed(3) : '--'}</td>
                    <td>${record.co2 !== null ? record.co2.toFixed(0) : '--'}</td>
                    <td>${record.temperature !== null ? record.temperature.toFixed(1) : '--'}</td>
                    <td>${record.humidity !== null ? record.humidity.toFixed(1) : '--'}</td>
                    <td>
                        <button class="delete-row-btn" onclick="window.deleteCollectRow(${record.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    window.deleteCollectRow = function(id) {
        collectState.collectedData = collectState.collectedData.filter(r => r.id !== id);
        saveCollectedData();
        updateCollectTable();
        updateCollectCount();
        updateStats();
        showToast('已删除', '记录已删除', 'info');
    };

    function updateCollectCount() {
        const count = collectState.collectedData.length;
        if (elements.collectCount) elements.collectCount.textContent = count;
        if (elements.dataCountBadge) elements.dataCountBadge.textContent = `${count} 条`;
    }

    function updateStats() {
        const data = collectState.collectedData;

        // 总数
        const statTotal = document.getElementById('statTotal');
        if (statTotal) statTotal.textContent = data.length;

        // 按标签统计
        const statUnripe = document.getElementById('statUnripe');
        const statRipe = document.getElementById('statRipe');
        const statOverripe = document.getElementById('statOverripe');

        if (statUnripe) statUnripe.textContent = data.filter(r => r.maturity_label === 'unripe').length;
        if (statRipe) statRipe.textContent = data.filter(r => r.maturity_label === 'ripe').length;
        if (statOverripe) statOverripe.textContent = data.filter(r => r.maturity_label === 'overripe').length;

        // 按水果统计
        const fruitStats = document.getElementById('fruitStats');
        if (fruitStats) {
            if (data.length === 0) {
                fruitStats.innerHTML = '<p class="empty-hint">暂无数据</p>';
            } else {
                const fruitCounts = {};
                data.forEach(r => {
                    fruitCounts[r.fruit_type] = (fruitCounts[r.fruit_type] || 0) + 1;
                });

                fruitStats.innerHTML = Object.entries(fruitCounts).map(([fruit, count]) => `
                    <div class="fruit-stat-item">
                        <span class="fruit-stat-name">${FRUIT_NAMES[fruit] || fruit}</span>
                        <span class="fruit-stat-count">${count} 条</span>
                    </div>
                `).join('');
            }
        }
    }

    function exportToCsv() {
        if (collectState.collectedData.length === 0) {
            showToast('无数据', '没有可导出的数据', 'warning');
            return;
        }

        const headers = [
            'timestamp', 'fruit_type', 'maturity_label',
            'ethanol_adc', 'ethylene_voltage_v', 'tvoc_mg_m3', 'hcho_mg_m3',
            'co2_ppm', 'aqi', 'temperature_c', 'humidity_percent'
        ];

        const csvContent = [
            headers.join(','),
            ...collectState.collectedData.map(record => [
                record.timestamp,
                record.fruit_type,
                record.maturity_label,
                record.ethanol_adc !== null ? record.ethanol_adc : '',
                record.ethylene_voltage !== null ? record.ethylene_voltage.toFixed(2) : '',
                record.tvoc !== null ? record.tvoc.toFixed(3) : '',
                record.hcho !== null ? record.hcho.toFixed(3) : '',
                record.co2 !== null ? record.co2.toFixed(0) : '',
                record.aqi !== null ? record.aqi.toFixed(0) : '',
                record.temperature !== null ? record.temperature.toFixed(1) : '',
                record.humidity !== null ? record.humidity.toFixed(1) : ''
            ].join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const now = new Date();
        const filename = `fruit_train_data_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.csv`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('导出成功', `已导出 ${collectState.collectedData.length} 条数据`, 'success');
    }

    function clearCollectedData() {
        if (collectState.collectedData.length === 0) {
            showToast('无数据', '没有可清空的数据', 'info');
            return;
        }

        if (confirm(`确定要清空所有 ${collectState.collectedData.length} 条采集数据吗？\n此操作不可恢复！`)) {
            collectState.collectedData = [];
            saveCollectedData();
            updateCollectTable();
            updateCollectCount();
            updateStats();
            showToast('已清空', '所有采集数据已清空', 'info');
        }
    }

    function saveCollectedData() {
        try {
            localStorage.setItem('fruitCollectedData', JSON.stringify(collectState.collectedData));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    }

    function loadCollectedData() {
        try {
            const saved = localStorage.getItem('fruitCollectedData');
            if (saved) {
                collectState.collectedData = JSON.parse(saved);
                updateCollectTable();
                updateCollectCount();
                updateStats();
            }
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    }

    // ===== 自动采集功能 =====
    function startAutoCollect() {
        const interval = parseInt(elements.autoInterval?.value) || 5;
        const count = parseInt(elements.autoCount?.value) || 0;

        // 检查是否有有效数据
        const data = appState.sensorData;
        const hasValidData = data.ethanol_adc !== null || data.ethylene_voltage !== null ||
                            data.tvoc !== null || data.co2 !== null;

        if (!hasValidData) {
            showToast('无法开始', '请先连接传感器获取数据', 'warning');
            return;
        }

        collectState.autoCollecting = true;
        collectState.autoCollectedCount = 0;
        collectState.autoTargetCount = count;

        // 更新 UI 状态
        updateAutoCollectUI(true);

        showToast('自动采集已开始', `每 ${interval} 秒采集一次${count > 0 ? `，共 ${count} 次` : ''}`, 'success');

        // 立即采集一次
        doAutoCollect();

        // 启动定时器
        let remainingSeconds = interval;

        // 倒计时显示
        collectState.countdownTimer = setInterval(() => {
            remainingSeconds--;
            if (elements.autoCountdown) {
                elements.autoCountdown.textContent = `下次采集: ${remainingSeconds}s`;
                elements.autoCountdown.classList.add('counting');
            }
            if (remainingSeconds <= 0) {
                remainingSeconds = interval;
            }
        }, 1000);

        // 采集定时器
        collectState.autoTimer = setInterval(() => {
            doAutoCollect();
        }, interval * 1000);
    }

    function doAutoCollect() {
        if (!collectState.autoCollecting) return;

        // 检查是否有有效数据
        const data = appState.sensorData;
        const hasValidData = data.ethanol_adc !== null || data.ethylene_voltage !== null ||
                            data.tvoc !== null || data.co2 !== null;

        if (!hasValidData) {
            showToast('采集跳过', '当前无有效传感器数据', 'warning');
            return;
        }

        // 执行采集
        recordCurrentData();
        collectState.autoCollectedCount++;

        // 更新计数显示
        if (elements.autoCollected) {
            elements.autoCollected.textContent = collectState.autoCollectedCount;
        }

        // 检查是否达到目标次数
        if (collectState.autoTargetCount > 0 && collectState.autoCollectedCount >= collectState.autoTargetCount) {
            stopAutoCollect();
            showToast('采集完成', `已完成 ${collectState.autoCollectedCount} 次自动采集`, 'success');
        }
    }

    function stopAutoCollect() {
        collectState.autoCollecting = false;

        // 清除定时器
        if (collectState.autoTimer) {
            clearInterval(collectState.autoTimer);
            collectState.autoTimer = null;
        }
        if (collectState.countdownTimer) {
            clearInterval(collectState.countdownTimer);
            collectState.countdownTimer = null;
        }

        // 更新 UI 状态
        updateAutoCollectUI(false);

        if (elements.autoCountdown) {
            elements.autoCountdown.textContent = '';
            elements.autoCountdown.classList.remove('counting');
        }
    }

    function updateAutoCollectUI(isRunning) {
        // 更新状态指示器
        if (elements.autoCollectStatus) {
            elements.autoCollectStatus.classList.toggle('active', isRunning);
            const statusText = elements.autoCollectStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = isRunning ? '运行中' : '已关闭';
            }
        }

        // 更新按钮状态
        if (elements.startAutoBtn) {
            elements.startAutoBtn.disabled = isRunning;
        }
        if (elements.stopAutoBtn) {
            elements.stopAutoBtn.disabled = !isRunning;
        }

        // 更新输入框状态
        if (elements.autoInterval) {
            elements.autoInterval.disabled = isRunning;
        }
        if (elements.autoCount) {
            elements.autoCount.disabled = isRunning;
        }
    }

    // ===== 导航系统 =====
    function switchPanel(panelName) {
        const panelMap = {
            'collect': 'collectPanel',
            'preview': 'previewPanel',
            'connection': 'connectionPanel'
        };

        const titleMap = {
            'collect': '数据采集',
            'preview': '数据预览',
            'connection': '连接设置'
        };

        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.panel === panelName);
        });

        elements.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === panelMap[panelName]);
        });

        if (elements.pageTitle) {
            elements.pageTitle.textContent = titleMap[panelName] || panelName;
        }

        if (window.innerWidth <= 1024 && elements.sidebar) {
            elements.sidebar.classList.remove('open');
        }
    }

    // ===== 事件绑定 =====
    function initUIEvents() {
        // 导航
        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPanel(item.dataset.panel);
            });
        });

        // 侧边栏
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', () => {
                elements.sidebar.classList.toggle('open');
            });
        }

        // 连接
        if (elements.connectBtn) {
            elements.connectBtn.addEventListener('click', () => {
                const host = elements.serverHost?.value || 'ws://139.159.209.44:8080';
                updateConnectionUI('connecting');
                wsClient.connect(host).then(() => {
                    // 连接成功，回调会处理
                }).catch((err) => {
                    showToast('连接失败', err.message || '无法连接到服务器', 'error');
                    updateConnectionUI('disconnected');
                });
            });
        }

        if (elements.disconnectBtn) {
            elements.disconnectBtn.addEventListener('click', () => {
                wsClient.disconnect();
            });
        }

        // 采集
        if (elements.recordDataBtn) {
            elements.recordDataBtn.addEventListener('click', recordCurrentData);
        }

        if (elements.exportCsvBtn) {
            elements.exportCsvBtn.addEventListener('click', exportToCsv);
        }

        if (elements.clearCollectBtn) {
            elements.clearCollectBtn.addEventListener('click', clearCollectedData);
        }

        // 自动采集
        if (elements.startAutoBtn) {
            elements.startAutoBtn.addEventListener('click', startAutoCollect);
        }

        if (elements.stopAutoBtn) {
            elements.stopAutoBtn.addEventListener('click', () => {
                stopAutoCollect();
                showToast('已停止', '自动采集已停止', 'info');
            });
        }

        // 水果选择
        document.querySelectorAll('.collect-fruit-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.collect-fruit-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                collectState.selectedFruit = item.dataset.fruit;
            });
        });

        // 标签选择
        document.querySelectorAll('.maturity-label-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.maturity-label-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                collectState.selectedLabel = item.dataset.label;
            });
        });

        // 侧边栏关闭
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
    function init() {
        initWebSocketEvents();
        initUIEvents();
        loadCollectedData();

        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);

        updateStats();

        showToast('训练模式', '已进入数据采集模式', 'info');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
