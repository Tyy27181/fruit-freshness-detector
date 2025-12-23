/**
 * 水果成熟度检测系统 - 主应用逻辑
 * 基于 TinyML 的水果成熟度检测
 */

(function() {
    'use strict';

    // 水果配置
    const FRUITS = {
        apple: { name: '苹果', icon: '🍎', shelfLife: { unripe: '7-10天', ripe: '3-5天', overripe: '1-2天' } },
        banana: { name: '香蕉', icon: '🍌', shelfLife: { unripe: '5-7天', ripe: '2-3天', overripe: '1天' } },
        orange: { name: '橙子', icon: '🍊', shelfLife: { unripe: '14-21天', ripe: '7-10天', overripe: '3-5天' } },
        grape: { name: '葡萄', icon: '🍇', shelfLife: { unripe: '7-10天', ripe: '3-5天', overripe: '1-2天' } },
        strawberry: { name: '草莓', icon: '🍓', shelfLife: { unripe: '5-7天', ripe: '2-3天', overripe: '1天' } },
        mango: { name: '芒果', icon: '🥭', shelfLife: { unripe: '7-10天', ripe: '3-5天', overripe: '1-2天' } }
    };

    // 应用状态
    const appState = {
        connected: false,
        currentFruit: 'apple',
        sensorData: {
            ethanol: null,      // 乙醇 ppm
            ethylene: null,     // 乙烯 ppm (C2H4)
            tvoc: null,         // TVOC mg/m3
            hcho: null,         // 甲醛 mg/m3
            co2: null,          // 二氧化碳 ppm
            aqi: null,          // 空气质量指数
            temperature: null,  // 温度 °C
            humidity: null,     // 湿度 %RH
            battery: null       // 电池电量 %
        },
        maturity: null,         // 成熟度评分 0-100
        maturityStage: null,    // 成熟阶段: unripe, ripe, overripe
        lastUpdate: null,
        history: [],
        settings: {
            darkMode: true,
            freshnessAlert: true,
            tempAlert: true,
            soundAlert: false,
            autoRefresh: true
        }
    };

    // 传感器阈值配置
    const THRESHOLDS = {
        ethanol: { normal: 50, warning: 150, max: 1000 },
        ethylene: { normal: 10, warning: 30, max: 100 },    // 乙烯 ppm
        tvoc: { normal: 0.5, warning: 1.0, max: 3.0 },      // mg/m3
        hcho: { normal: 0.08, warning: 0.1, max: 0.5 },     // mg/m3 甲醛
        co2: { min: 400, normal: 1000, warning: 2000, max: 5000 },
        aqi: { normal: 50, warning: 100, max: 300 },
        temperature: { normal: 30, warning: 35, max: 50 },   // >30 异常
        humidity: { normal: 90, warning: 95, max: 100 }      // >90 异常
    };

    // DOM 元素
    const elements = {
        // 导航
        navItems: document.querySelectorAll('.nav-item'),
        panels: document.querySelectorAll('.panel'),
        pageTitle: document.querySelector('.page-title'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.querySelector('.sidebar'),

        // 连接状态
        connectionStatus: document.getElementById('connectionStatus'),
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),
        serverHost: document.getElementById('serverHost'),

        // 水果选择
        fruitSelector: document.getElementById('fruitSelector'),
        fruitItems: document.querySelectorAll('.fruit-item'),
        currentFruit: document.getElementById('currentFruit'),

        // 成熟度
        freshnessValue: document.getElementById('freshnessValue'),
        freshnessStatus: document.getElementById('freshnessStatus'),
        gaugeFill: document.getElementById('gaugeFill'),
        maturityBadge: document.getElementById('maturityBadge'),
        maturityDesc: document.getElementById('maturityDesc'),

        // TinyML 预测
        maturityStage: document.getElementById('maturityStage'),
        shelfLife: document.getElementById('shelfLife'),
        storageAdvice: document.getElementById('storageAdvice'),
        confidence: document.getElementById('confidence'),

        // 气体传感器
        ethanolValue: document.getElementById('ethanolValue'),
        ethanolBar: document.getElementById('ethanolBar'),
        ethyleneValue: document.getElementById('ethyleneValue'),
        ethyleneBar: document.getElementById('ethyleneBar'),
        tvocValue: document.getElementById('tvocValue'),
        tvocBar: document.getElementById('tvocBar'),
        hchoValue: document.getElementById('hchoValue'),
        hchoBar: document.getElementById('hchoBar'),
        co2Value: document.getElementById('co2Value'),
        co2Bar: document.getElementById('co2Bar'),
        aqiValue: document.getElementById('aqiValue'),
        aqiBar: document.getElementById('aqiBar'),

        // 环境
        temperatureValue: document.getElementById('temperatureValue'),
        temperatureStatus: document.getElementById('temperatureStatus'),
        humidityValue: document.getElementById('humidityValue'),
        humidityStatus: document.getElementById('humidityStatus'),

        // 其他
        lastUpdate: document.getElementById('lastUpdate'),
        currentTime: document.getElementById('currentTime'),
        toastContainer: document.getElementById('toastContainer'),
        alertModal: document.getElementById('alertModal'),
        alertMessage: document.getElementById('alertMessage'),
        closeAlert: document.getElementById('closeAlert'),

        // 电池
        batteryStatus: document.getElementById('batteryStatus'),
        batteryLevel: document.getElementById('batteryLevel'),
        batteryPercent: document.getElementById('batteryPercent'),

        // 设置
        darkModeToggle: document.getElementById('darkModeToggle'),
        freshnessAlert: document.getElementById('freshnessAlert'),
        tempAlert: document.getElementById('tempAlert'),
        soundAlert: document.getElementById('soundAlert'),
        autoRefresh: document.getElementById('autoRefresh'),

        // 历史
        historyList: document.getElementById('historyList')
    };

    // ===== 工具函数 =====

    function formatTime(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Toast 通知 =====

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

        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }
    }

    function removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }

    // ===== 成熟度计算 =====

    function calculateMaturity() {
        const data = appState.sensorData;

        // 如果没有足够的数据，返回 null
        if (data.ethanol === null && data.ethylene === null && data.tvoc === null) {
            return null;
        }

        // 成熟度评分：0-30 未熟，30-70 成熟，70-100 过熟
        let score = 0;
        let factors = 0;

        // 乙烯是水果成熟的关键指标 (权重: 40%)
        if (data.ethylene !== null) {
            // 乙烯越高，成熟度越高
            score += Math.min(100, (data.ethylene / THRESHOLDS.ethylene.max) * 100) * 0.4;
            factors++;
        }

        // 乙醇 (权重: 30%) - 乙醇越高，越可能过熟
        if (data.ethanol !== null) {
            score += Math.min(100, (data.ethanol / THRESHOLDS.ethanol.max) * 100) * 0.3;
            factors++;
        }

        // TVOC (权重: 20%)
        if (data.tvoc !== null) {
            score += Math.min(100, (data.tvoc / THRESHOLDS.tvoc.max) * 100) * 0.2;
            factors++;
        }

        // CO2 (权重: 10%)
        if (data.co2 !== null) {
            const co2Ratio = (data.co2 - THRESHOLDS.co2.min) / (THRESHOLDS.co2.max - THRESHOLDS.co2.min);
            score += Math.min(100, Math.max(0, co2Ratio * 100)) * 0.1;
            factors++;
        }

        if (factors === 0) return null;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function getMaturityStage(score) {
        if (score === null) return null;
        if (score < 30) return 'unripe';
        if (score < 70) return 'ripe';
        return 'overripe';
    }

    function getStorageAdvice(stage, fruitType) {
        const advices = {
            unripe: '常温存放，加速成熟',
            ripe: '冷藏保存，尽快食用',
            overripe: '立即食用或加工处理'
        };
        return advices[stage] || '--';
    }

    // ===== 水果选择 =====

    function selectFruit(fruitKey) {
        appState.currentFruit = fruitKey;
        const fruit = FRUITS[fruitKey];

        // 更新选择状态
        document.querySelectorAll('.fruit-item').forEach(item => {
            item.classList.toggle('active', item.dataset.fruit === fruitKey);
        });

        // 更新当前水果显示
        if (elements.currentFruit) {
            elements.currentFruit.innerHTML = `
                <span class="fruit-icon-large">${fruit.icon}</span>
                <span class="fruit-type">${fruit.name}</span>
            `;
        }

        // 重新计算并更新显示
        updateMaturityDisplay();
    }

    // ===== UI 更新函数 =====

    function updateMaturityDisplay() {
        const maturity = calculateMaturity();
        appState.maturity = maturity;
        const stage = getMaturityStage(maturity);
        appState.maturityStage = stage;
        const fruit = FRUITS[appState.currentFruit];

        if (maturity === null) {
            elements.freshnessValue.textContent = '--';
            elements.gaugeFill.style.strokeDashoffset = 502;
            if (elements.maturityBadge) elements.maturityBadge.textContent = '等待检测';
            if (elements.maturityBadge) elements.maturityBadge.className = 'status-badge';
            if (elements.maturityDesc) elements.maturityDesc.textContent = '请连接传感器开始检测';
            if (elements.maturityStage) elements.maturityStage.textContent = '--';
            if (elements.shelfLife) elements.shelfLife.textContent = '--';
            if (elements.storageAdvice) elements.storageAdvice.textContent = '--';
            if (elements.confidence) elements.confidence.textContent = '--';
            return;
        }

        // 更新数值
        elements.freshnessValue.textContent = maturity + '%';

        // 更新仪表盘
        const offset = 502 - (502 * maturity / 100);
        elements.gaugeFill.style.strokeDashoffset = offset;

        // 根据成熟阶段更新显示
        let stageText, badgeClass, colorClass, desc;

        if (stage === 'unripe') {
            stageText = '未成熟';
            badgeClass = 'unripe';
            colorClass = '';
            desc = '水果尚未成熟，可继续存放';
        } else if (stage === 'ripe') {
            stageText = '最佳食用期';
            badgeClass = 'optimal';
            colorClass = 'warning';
            desc = '水果已成熟，建议尽快食用';
        } else {
            stageText = '过度成熟';
            badgeClass = 'overripe';
            colorClass = 'danger';
            desc = '水果已过熟，请立即处理';
        }

        // SVG 元素需要使用 setAttribute 而不是 className
        elements.gaugeFill.setAttribute('class', 'gauge-fill ' + colorClass);

        if (elements.maturityBadge) {
            elements.maturityBadge.textContent = stageText;
            elements.maturityBadge.className = 'status-badge ' + badgeClass;
        }
        if (elements.maturityDesc) elements.maturityDesc.textContent = desc;

        // 更新 TinyML 预测结果
        if (elements.maturityStage) elements.maturityStage.textContent = stageText;
        if (elements.shelfLife) elements.shelfLife.textContent = fruit.shelfLife[stage] || '--';
        if (elements.storageAdvice) elements.storageAdvice.textContent = getStorageAdvice(stage, appState.currentFruit);

        // 模拟置信度 (实际应从TinyML模型获取)
        const confidence = 85 + Math.random() * 10;
        if (elements.confidence) elements.confidence.textContent = confidence.toFixed(1) + '%';

        // 检查是否需要预警
        if (stage === 'overripe' && appState.settings.freshnessAlert) {
            showAlert(`${fruit.name}已过度成熟，请立即处理！`);
        }
    }

    // 保留旧函数名兼容
    function updateFreshnessDisplay() {
        updateMaturityDisplay();
    }

    function updateSensorDisplay(sensor, value, barElement, valueElement, threshold) {
        if (value === null) {
            valueElement.textContent = '--';
            barElement.style.width = '0%';
            return;
        }

        // 气体数据显示两位小数
        valueElement.textContent = value.toFixed(2);

        // 计算进度条百分比
        let percent, colorClass;
        const card = barElement.closest('.sensor-card');

        if (sensor === 'co2') {
            percent = ((value - threshold.min) / (threshold.max - threshold.min)) * 100;
            if (value <= threshold.normal) {
                colorClass = '';
            } else if (value <= threshold.warning) {
                colorClass = 'warning';
            } else {
                colorClass = 'danger';
            }
        } else {
            percent = (value / threshold.max) * 100;
            if (value <= threshold.normal) {
                colorClass = '';
            } else if (value <= threshold.warning) {
                colorClass = 'warning';
            } else {
                colorClass = 'danger';
            }
        }

        barElement.style.width = Math.min(100, percent) + '%';
        barElement.className = 'bar-fill ' + colorClass;
        card.className = 'sensor-card ' + colorClass;
    }

    function updateEnvironmentDisplay(sensor, value, valueElement, statusElement, threshold) {
        if (value === null) {
            valueElement.textContent = '--';
            return;
        }

        valueElement.textContent = value.toFixed(1);

        const card = valueElement.closest('.env-card');
        let colorClass = '';

        // 温度 >30 异常，>35 危险
        if (sensor === 'temperature') {
            if (value > threshold.warning) {
                colorClass = 'danger';
                if (appState.settings.tempAlert) {
                    showAlert(`温度异常: ${value.toFixed(1)}°C，请检查储存环境！`);
                }
            } else if (value > threshold.normal) {
                colorClass = 'warning';
            }
        }
        // 湿度 >90 异常，>95 危险
        else if (sensor === 'humidity') {
            if (value > threshold.warning) {
                colorClass = 'danger';
            } else if (value > threshold.normal) {
                colorClass = 'warning';
            }
        }

        card.className = 'env-card ' + colorClass;
    }

    function updateLastUpdate() {
        if (appState.lastUpdate) {
            elements.lastUpdate.textContent = formatDateTime(appState.lastUpdate);
        }
    }

    function updateBatteryDisplay() {
        const battery = appState.sensorData.battery;

        if (battery === null || !elements.batteryLevel || !elements.batteryPercent) {
            if (elements.batteryPercent) elements.batteryPercent.textContent = '--%';
            if (elements.batteryLevel) elements.batteryLevel.style.width = '0%';
            return;
        }

        // 更新电量百分比文本
        elements.batteryPercent.textContent = Math.round(battery) + '%';

        // 更新电量条宽度
        elements.batteryLevel.style.width = Math.min(100, battery) + '%';

        // 根据电量设置颜色
        elements.batteryLevel.classList.remove('warning', 'danger');
        if (battery <= 10) {
            elements.batteryLevel.classList.add('danger');
        } else if (battery <= 30) {
            elements.batteryLevel.classList.add('warning');
        }
    }

    // ===== 数据处理 =====

    /**
     * 解析传感器数据格式
     * 支持格式：
     * 1. "Ethanol: 12.34 ppm (ADC: 1234, Alarm: 0)"
     * 2. "TVOC:0.123mg/m3 HCHO:0.045mg/m3 CO2:800ppm AQI:50 T:25.5C H:65.0%"
     * 3. JSON 对象
     */
    function processSensorData(data) {
        try {
            if (typeof data === 'string') {
                // 格式: "TVOC:0.123mg/m3 HCHO:0.045mg/m3 CO2:800ppm AQI:50 T:25.5C H:65.0%"
                // 或: "Ethanol: 12.34 ppm (ADC: 1234, Alarm: 0)"

                // TVOC: 数字mg/m3
                const tvocMatch = data.match(/TVOC[:\s]*([\d.]+)\s*mg\/m3/i);
                if (tvocMatch) {
                    appState.sensorData.tvoc = parseFloat(tvocMatch[1]);
                }

                // HCHO (甲醛): 数字mg/m3
                const hchoMatch = data.match(/HCHO[:\s]*([\d.]+)\s*mg\/m3/i);
                if (hchoMatch) {
                    appState.sensorData.hcho = parseFloat(hchoMatch[1]);
                }

                // CO2: 数字ppm
                const co2Match = data.match(/CO2[:\s]*([\d.]+)\s*ppm/i);
                if (co2Match) {
                    appState.sensorData.co2 = parseFloat(co2Match[1]);
                }

                // AQI: 数字
                const aqiMatch = data.match(/AQI[:\s]*([\d.]+)/i);
                if (aqiMatch) {
                    appState.sensorData.aqi = parseFloat(aqiMatch[1]);
                }

                // 温度 T: 数字C
                const tempMatch = data.match(/T[:\s]*([\d.]+)\s*C/i);
                if (tempMatch) {
                    appState.sensorData.temperature = parseFloat(tempMatch[1]);
                }

                // 湿度 H: 数字%
                const humMatch = data.match(/H[:\s]*([\d.]+)\s*%/i);
                if (humMatch) {
                    appState.sensorData.humidity = parseFloat(humMatch[1]);
                }

                // Ethanol: 数字 ppm
                const ethanolMatch = data.match(/Ethanol[:\s]*([\d.]+)\s*ppm/i);
                if (ethanolMatch) {
                    appState.sensorData.ethanol = parseFloat(ethanolMatch[1]);
                }

                // C2H4 (乙烯): 数字 PPM  格式: "C2H4:12.34 PPM"
                const ethyleneMatch = data.match(/C2H4[:\s]*([\d.]+)\s*PPM/i);
                if (ethyleneMatch) {
                    appState.sensorData.ethylene = parseFloat(ethyleneMatch[1]);
                }

                // 电池电量: charge_voltage:80.5% (80.5%)
                const batteryMatch = data.match(/charge_voltage[:\s]*([\d.]+)\s*%?/i);
                if (batteryMatch) {
                    appState.sensorData.battery = parseFloat(batteryMatch[1]);
                }

            } else if (typeof data === 'object') {
                // JSON 对象格式
                if (data.ethanol !== undefined) appState.sensorData.ethanol = parseFloat(data.ethanol);
                if (data.ethylene !== undefined) appState.sensorData.ethylene = parseFloat(data.ethylene);
                if (data.c2h4 !== undefined) appState.sensorData.ethylene = parseFloat(data.c2h4);
                if (data.tvoc !== undefined) appState.sensorData.tvoc = parseFloat(data.tvoc);
                if (data.hcho !== undefined) appState.sensorData.hcho = parseFloat(data.hcho);
                if (data.co2 !== undefined) appState.sensorData.co2 = parseFloat(data.co2);
                if (data.aqi !== undefined) appState.sensorData.aqi = parseFloat(data.aqi);
                if (data.temperature !== undefined) appState.sensorData.temperature = parseFloat(data.temperature);
                if (data.temp !== undefined) appState.sensorData.temperature = parseFloat(data.temp);
                if (data.humidity !== undefined) appState.sensorData.humidity = parseFloat(data.humidity);
                if (data.hum !== undefined) appState.sensorData.humidity = parseFloat(data.hum);
                if (data.battery !== undefined) appState.sensorData.battery = parseFloat(data.battery);
                if (data.bat !== undefined) appState.sensorData.battery = parseFloat(data.bat);
            }

            appState.lastUpdate = new Date();
            updateAllDisplays();
            addToHistory();

        } catch (e) {
            console.error('解析传感器数据失败:', e);
        }
    }

    function updateAllDisplays() {
        // 更新气体传感器显示
        updateSensorDisplay('ethanol', appState.sensorData.ethanol,
            elements.ethanolBar, elements.ethanolValue, THRESHOLDS.ethanol);
        updateSensorDisplay('ethylene', appState.sensorData.ethylene,
            elements.ethyleneBar, elements.ethyleneValue, THRESHOLDS.ethylene);
        updateSensorDisplay('tvoc', appState.sensorData.tvoc,
            elements.tvocBar, elements.tvocValue, THRESHOLDS.tvoc);
        updateSensorDisplay('hcho', appState.sensorData.hcho,
            elements.hchoBar, elements.hchoValue, THRESHOLDS.hcho);
        updateSensorDisplay('co2', appState.sensorData.co2,
            elements.co2Bar, elements.co2Value, THRESHOLDS.co2);
        updateSensorDisplay('aqi', appState.sensorData.aqi,
            elements.aqiBar, elements.aqiValue, THRESHOLDS.aqi);

        // 更新环境显示
        updateEnvironmentDisplay('temperature', appState.sensorData.temperature,
            elements.temperatureValue, elements.temperatureStatus, THRESHOLDS.temperature);
        updateEnvironmentDisplay('humidity', appState.sensorData.humidity,
            elements.humidityValue, elements.humidityStatus, THRESHOLDS.humidity);

        // 更新新鲜度
        updateFreshnessDisplay();

        // 更新电池电量
        updateBatteryDisplay();

        // 更新采集预览
        updateCollectPreview();

        // 更新时间
        updateLastUpdate();
    }

    function addToHistory() {
        const record = {
            timestamp: new Date(),
            data: { ...appState.sensorData },
            freshness: appState.freshness
        };

        appState.history.unshift(record);

        // 限制历史记录数量
        if (appState.history.length > 100) {
            appState.history.pop();
        }

        updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
        if (appState.history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无历史记录</p>
                </div>
            `;
            return;
        }

        const html = appState.history.slice(0, 20).map(record => {
            let freshnessClass = 'good';
            if (record.freshness < 60) freshnessClass = 'warning';
            if (record.freshness < 40) freshnessClass = 'bad';

            return `
                <div class="history-item">
                    <span class="history-time">${formatDateTime(record.timestamp)}</span>
                    <div class="history-data">
                        <span>TVOC: ${record.data.tvoc?.toFixed(3) || '--'} mg/m3</span>
                        <span>HCHO: ${record.data.hcho?.toFixed(3) || '--'} mg/m3</span>
                        <span>CO2: ${record.data.co2?.toFixed(0) || '--'} ppm</span>
                        <span>T: ${record.data.temperature?.toFixed(1) || '--'}°C</span>
                        <span>H: ${record.data.humidity?.toFixed(1) || '--'}%</span>
                    </div>
                    <span class="history-freshness ${freshnessClass}">${record.freshness || '--'}%</span>
                </div>
            `;
        }).join('');

        elements.historyList.innerHTML = html;
    }

    // ===== 预警系统 =====

    function showAlert(message) {
        elements.alertMessage.textContent = message;
        elements.alertModal.classList.add('active');

        if (appState.settings.soundAlert) {
            playAlertSound();
        }
    }

    function hideAlert() {
        elements.alertModal.classList.remove('active');
    }

    function playAlertSound() {
        // 简单的蜂鸣声
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('无法播放提示音');
        }
    }

    // ===== 连接管理 =====

    function updateConnectionUI(connected) {
        appState.connected = connected;

        if (connected) {
            elements.connectionStatus.classList.add('connected');
            elements.connectionStatus.querySelector('.status-text').textContent = '传感器在线';
            if (elements.connectBtn) elements.connectBtn.disabled = true;
            if (elements.disconnectBtn) elements.disconnectBtn.disabled = false;
            if (elements.serverHost) elements.serverHost.disabled = true;
        } else {
            elements.connectionStatus.classList.remove('connected');
            elements.connectionStatus.querySelector('.status-text').textContent = '传感器离线';
            if (elements.connectBtn) elements.connectBtn.disabled = false;
            if (elements.disconnectBtn) elements.disconnectBtn.disabled = true;
            if (elements.serverHost) elements.serverHost.disabled = false;
        }
    }

    async function connect() {
        const host = elements.serverHost.value.trim() || 'ws://139.159.209.44:8080';

        showToast('连接中', '正在连接传感器...', 'info');

        try {
            await wsClient.connect(host, null);
        } catch (error) {
            showToast('连接失败', error.message, 'error');
        }
    }

    function disconnect() {
        wsClient.disconnect();
    }

    // ===== WebSocket 事件 =====

    function initWebSocketEvents() {
        wsClient.onConnected = (info) => {
            updateConnectionUI(true);
            showToast('连接成功', '传感器已连接', 'success');
        };

        wsClient.onDisconnected = (info) => {
            updateConnectionUI(false);
            showToast('连接断开', '传感器已断开', 'warning');
        };

        wsClient.onMessage = (message) => {
            handleIncomingMessage(message);
        };

        wsClient.onError = (error) => {
            showToast('错误', error.message || '连接错误', 'error');
        };
    }

    function handleIncomingMessage(message) {
        // 处理转发消息（来自传感器的数据）
        if (message.type === 'forward' && message.data) {
            const content = message.data.content || message.data;
            processSensorData(content);
        }
        // 处理原始消息（非JSON格式的数据）
        else if (message.type === 'raw' && message.content) {
            processSensorData(message.content);
        }
        // 处理系统消息
        else if (message.type === 'system') {
            // 可以处理系统通知
        }
    }

    // ===== 导航系统 =====

    function switchPanel(panelName) {
        const panelMap = {
            'monitor': 'monitorPanel',
            'analysis': 'analysisPanel',
            'history': 'historyPanel',
            'collect': 'collectPanel',
            'settings': 'settingsPanel'
        };

        const titleMap = {
            'monitor': '实时监控',
            'analysis': '数据分析',
            'history': '历史记录',
            'collect': '数据采集',
            'settings': '系统设置'
        };

        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.panel === panelName);
        });

        elements.panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === panelMap[panelName]);
        });

        if (elements.pageTitle) {
            elements.pageTitle.textContent = titleMap[panelName];
        }

        if (window.innerWidth <= 1024) {
            elements.sidebar.classList.remove('open');
        }
    }

    // ===== 设置 =====

    function toggleDarkMode(enabled) {
        appState.settings.darkMode = enabled;
        document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
        localStorage.setItem('fruitDarkMode', enabled);
    }

    function loadSettings() {
        const darkMode = localStorage.getItem('fruitDarkMode');
        if (darkMode !== null) {
            appState.settings.darkMode = darkMode === 'true';
        }
        if (elements.darkModeToggle) {
            elements.darkModeToggle.checked = appState.settings.darkMode;
        }
        toggleDarkMode(appState.settings.darkMode);
    }

    // ===== 时钟 =====

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

    function initUIEvents() {
        // 导航
        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPanel(item.dataset.panel);
            });
        });

        // 菜单
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', () => {
                elements.sidebar.classList.toggle('open');
            });
        }

        // 连接按钮
        if (elements.connectBtn) {
            elements.connectBtn.addEventListener('click', connect);
        }
        if (elements.disconnectBtn) {
            elements.disconnectBtn.addEventListener('click', disconnect);
        }

        // 水果选择
        document.querySelectorAll('.fruit-item').forEach(item => {
            item.addEventListener('click', () => {
                selectFruit(item.dataset.fruit);
            });
        });

        // 关闭预警
        if (elements.closeAlert) {
            elements.closeAlert.addEventListener('click', hideAlert);
        }

        // 设置
        if (elements.darkModeToggle) {
            elements.darkModeToggle.addEventListener('change', (e) => {
                toggleDarkMode(e.target.checked);
            });
        }
        if (elements.freshnessAlert) {
            elements.freshnessAlert.addEventListener('change', (e) => {
                appState.settings.freshnessAlert = e.target.checked;
            });
        }
        if (elements.tempAlert) {
            elements.tempAlert.addEventListener('change', (e) => {
                appState.settings.tempAlert = e.target.checked;
            });
        }
        if (elements.soundAlert) {
            elements.soundAlert.addEventListener('change', (e) => {
                appState.settings.soundAlert = e.target.checked;
            });
        }

        // 侧边栏关闭
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 &&
                elements.sidebar.classList.contains('open') &&
                !elements.sidebar.contains(e.target) &&
                !elements.menuToggle.contains(e.target)) {
                elements.sidebar.classList.remove('open');
            }
        });

        // 数据采集事件绑定
        initCollectEvents();
    }

    // ===== 数据采集功能 =====

    // 采集状态
    const collectState = {
        selectedFruit: 'apple',
        selectedLabel: 'unripe',
        collectedData: [],  // 存储采集的数据
    };

    // 水果名称映射
    const FRUIT_NAMES = {
        apple: '苹果',
        banana: '香蕉',
        orange: '橙子',
        grape: '葡萄',
        strawberry: '草莓',
        mango: '芒果'
    };

    // 标签名称映射
    const LABEL_NAMES = {
        unripe: '未成熟',
        ripe: '成熟',
        overripe: '过熟'
    };

    // 初始化数据采集事件
    function initCollectEvents() {
        // 水果选择
        document.querySelectorAll('.collect-fruit-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.collect-fruit-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                collectState.selectedFruit = item.dataset.fruit;
            });
        });

        // 成熟度标签选择
        document.querySelectorAll('.maturity-label-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.maturity-label-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                collectState.selectedLabel = item.dataset.label;
            });
        });

        // 记录数据按钮
        const recordBtn = document.getElementById('recordDataBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', recordCurrentData);
        }

        // 导出 CSV 按钮
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportToCsv);
        }

        // 清空数据按钮
        const clearBtn = document.getElementById('clearCollectBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCollectedData);
        }

        // 从 localStorage 恢复数据
        loadCollectedData();
    }

    // 更新采集预览显示
    function updateCollectPreview() {
        const data = appState.sensorData;
        const previewStatus = document.getElementById('previewStatus');

        // 更新预览值
        const setValue = (id, value, unit) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value !== null ? `${value.toFixed(2)} ${unit}` : `-- ${unit}`;
            }
        };

        setValue('previewEthanol', data.ethanol, 'ppm');
        setValue('previewEthylene', data.ethylene, 'ppm');
        setValue('previewTvoc', data.tvoc, 'mg/m³');
        setValue('previewHcho', data.hcho, 'mg/m³');
        setValue('previewCo2', data.co2, 'ppm');

        const aqiEl = document.getElementById('previewAqi');
        if (aqiEl) {
            aqiEl.textContent = data.aqi !== null ? data.aqi.toFixed(0) : '--';
        }

        const tempEl = document.getElementById('previewTemp');
        if (tempEl) {
            tempEl.textContent = data.temperature !== null ? `${data.temperature.toFixed(1)} °C` : '-- °C';
        }

        const humiEl = document.getElementById('previewHumi');
        if (humiEl) {
            humiEl.textContent = data.humidity !== null ? `${data.humidity.toFixed(1)} %` : '-- %';
        }

        // 更新状态
        if (previewStatus) {
            const hasData = data.ethanol !== null || data.ethylene !== null || data.tvoc !== null;
            if (hasData) {
                previewStatus.textContent = '数据就绪';
                previewStatus.classList.add('active');
            } else {
                previewStatus.textContent = '等待数据...';
                previewStatus.classList.remove('active');
            }
        }
    }

    // 记录当前数据
    function recordCurrentData() {
        const data = appState.sensorData;

        // 检查是否有有效数据
        const hasValidData = data.ethanol !== null || data.ethylene !== null ||
                            data.tvoc !== null || data.co2 !== null;

        if (!hasValidData) {
            showToast('无法记录', '请先连接传感器获取数据', 'warning');
            return;
        }

        // 创建记录
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            fruit_type: collectState.selectedFruit,
            maturity_label: collectState.selectedLabel,
            ethanol: data.ethanol,
            ethylene: data.ethylene,
            tvoc: data.tvoc,
            hcho: data.hcho,
            co2: data.co2,
            aqi: data.aqi,
            temperature: data.temperature,
            humidity: data.humidity
        };

        // 添加到数组
        collectState.collectedData.push(record);

        // 保存到 localStorage
        saveCollectedData();

        // 更新表格显示
        updateCollectTable();

        // 更新计数
        updateCollectCount();

        showToast('记录成功', `已记录 ${FRUIT_NAMES[record.fruit_type]} - ${LABEL_NAMES[record.maturity_label]}`, 'success');
    }

    // 更新采集表格
    function updateCollectTable() {
        const tbody = document.getElementById('collectTableBody');
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
                    <td>${record.ethanol !== null ? record.ethanol.toFixed(2) : '--'}</td>
                    <td>${record.ethylene !== null ? record.ethylene.toFixed(2) : '--'}</td>
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

    // 删除单条记录（暴露到全局）
    window.deleteCollectRow = function(id) {
        collectState.collectedData = collectState.collectedData.filter(r => r.id !== id);
        saveCollectedData();
        updateCollectTable();
        updateCollectCount();
        showToast('已删除', '记录已删除', 'info');
    };

    // 更新采集计数
    function updateCollectCount() {
        const count = collectState.collectedData.length;

        const countEl = document.getElementById('collectCount');
        if (countEl) countEl.textContent = count;

        const badgeEl = document.getElementById('dataCountBadge');
        if (badgeEl) badgeEl.textContent = `${count} 条`;
    }

    // 导出为 CSV
    function exportToCsv() {
        if (collectState.collectedData.length === 0) {
            showToast('无数据', '没有可导出的数据', 'warning');
            return;
        }

        // CSV 表头
        const headers = [
            'timestamp',
            'fruit_type',
            'maturity_label',
            'ethanol_ppm',
            'ethylene_ppm',
            'tvoc_mg_m3',
            'hcho_mg_m3',
            'co2_ppm',
            'aqi',
            'temperature_c',
            'humidity_percent'
        ];

        // 生成 CSV 内容
        const csvContent = [
            headers.join(','),
            ...collectState.collectedData.map(record => [
                record.timestamp,
                record.fruit_type,
                record.maturity_label,
                record.ethanol !== null ? record.ethanol.toFixed(2) : '',
                record.ethylene !== null ? record.ethylene.toFixed(2) : '',
                record.tvoc !== null ? record.tvoc.toFixed(3) : '',
                record.hcho !== null ? record.hcho.toFixed(3) : '',
                record.co2 !== null ? record.co2.toFixed(0) : '',
                record.aqi !== null ? record.aqi.toFixed(0) : '',
                record.temperature !== null ? record.temperature.toFixed(1) : '',
                record.humidity !== null ? record.humidity.toFixed(1) : ''
            ].join(','))
        ].join('\n');

        // 添加 BOM 以支持中文
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 生成文件名
        const now = new Date();
        const filename = `fruit_data_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.csv`;

        // 下载
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('导出成功', `已导出 ${collectState.collectedData.length} 条数据`, 'success');
    }

    // 清空采集数据
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
            showToast('已清空', '所有采集数据已清空', 'info');
        }
    }

    // 保存到 localStorage
    function saveCollectedData() {
        try {
            localStorage.setItem('fruitCollectedData', JSON.stringify(collectState.collectedData));
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    }

    // 从 localStorage 加载
    function loadCollectedData() {
        try {
            const saved = localStorage.getItem('fruitCollectedData');
            if (saved) {
                collectState.collectedData = JSON.parse(saved);
                updateCollectTable();
                updateCollectCount();
            }
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    }

    // ===== 初始化 =====

    function init() {
        loadSettings();
        initWebSocketEvents();
        initUIEvents();

        // 启动时钟
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);

        // 初始化显示
        updateAllDisplays();

        showToast('系统就绪', '请在设置中连接传感器', 'info');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
