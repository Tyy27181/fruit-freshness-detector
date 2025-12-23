# 水果新鲜度检测系统 - 项目文档

## 一、项目概述

这是一个基于多传感器融合的水果新鲜度/成熟度检测系统，目标是在嵌入式设备上运行TinyML模型，实现实时水果状态判断。

### 项目目标
- 使用多种气体传感器检测水果释放的挥发性物质
- 通过机器学习模型判断水果的成熟度/新鲜度
- 在STM32单片机上部署TinyML模型实现边缘推理
- 本科生毕业设计项目，计划发表论文和申请专利

### 当前阶段
**数据采集阶段** - 正在收集不同水果、不同成熟度的传感器数据用于训练模型

---

## 二、硬件架构

### 主控制器
- **MCU**: STM32F407VET6
- **开发环境**: Keil MDK
- **HAL库**: STM32 HAL

### 传感器配置

| 传感器 | 接口 | 功能 | 数据格式 |
|--------|------|------|----------|
| 乙醇传感器 | USART3 | 检测乙醇浓度 | ADC原始值 (0-4095) |
| 乙烯传感器 | ADC | 检测乙烯浓度 | 电压值 (0-3.3V) |
| 空气质量传感器 | USART2 | TVOC/HCHO/CO2/温湿度 | 14字节协议帧 |

### 通信模块
- **4G模块**: 通过USART6连接，用于云端数据传输
- **OLED显示屏**: 本地数据显示
- **调试串口**: USART1

### 传感器协议详解

#### 乙醇传感器协议 (11字节帧)
```
Byte0: 0xFE (帧头)
Byte1-3: 保留
Byte4: 报警位
Byte5-6: 浓度值 (High-Low, /100 = ppm)
Byte7-8: ADC值 (High-Low)
Byte9: 校验和 (Byte3-8累加)
Byte10: 保留
```

#### 空气质量传感器协议 (14字节帧)
```
Byte0-1: 0x2C 0xE4 (帧头)
Byte2-3: TVOC (Low-High, *0.001 = mg/m³)
Byte4-5: HCHO (Low-High, *0.001 = mg/m³)
Byte6-7: CO2 (Low-High, ppm)
Byte8: AQI (1-5)
Byte9-10: 温度 (小数-整数)
Byte11-12: 湿度 (小数-整数)
Byte13: 校验和
```

---

## 三、软件架构

### 嵌入式端 (keil_fruit/)

```
keil_fruit/
├── App/
│   ├── scheduler.c      # 任务调度器 (协作式多任务)
│   ├── scheduler.h
│   ├── uart_app.c       # 串口处理和传感器解析
│   ├── uart_app.h
│   ├── adc_app.c        # ADC采集 (乙烯传感器)
│   ├── oled_app.c       # OLED显示
│   ├── key_app.c        # 按键处理
│   └── led_app.c        # LED指示
├── Drivers/             # HAL驱动
└── Core/                # 主程序入口
```

#### 任务调度配置 (scheduler.c)
```c
static task_t scheduler_task[] = {
    {web_uart_proc, 1000, 0},  // 空气质量传感器处理
    {uart_proc, 1, 0},          // 调试串口
    {oled_task, 10, 0},         // OLED刷新
    {uart3_proc, 900, 0},       // 乙醇传感器处理
    {adc_task, 1000, 0},        // ADC采集(乙烯)
    {uart6_proc, 500, 0},       // 4G模块通信
    {led_proc, 10, 0},          // LED
    {key_proc, 10, 0}           // 按键
};
```

### 云端 (上云/)

```
上云/
├── server/
│   └── index.js         # Node.js WebSocket服务器
├── client/
│   ├── index.html       # 主界面 (实时数据展示)
│   ├── train.html       # 训练数据采集界面
│   ├── debug.html       # 调试界面
│   └── js/
│       ├── fruit-app.js  # 主界面逻辑
│       └── train-app.js  # 训练采集逻辑
└── package.json
```

### 云服务器信息
- **服务商**: 华为云
- **配置**: 2核2G2M带宽
- **系统**: Ubuntu 22.04
- **IP地址**: 139.159.209.44
- **端口**: 8080
- **进程管理**: PM2

### WebSocket通信
- **地址**: `ws://139.159.209.44:8080`
- **协议**: JSON格式消息
- **功能**: 实时传感器数据传输、训练数据采集

---

## 四、数据格式

### 训练数据CSV格式

```csv
timestamp,fruit_type,maturity_label,ethanol_adc,ethylene_voltage_v,tvoc_mg_m3,hcho_mg_m3,co2_ppm,aqi,temperature_c,humidity_percent
```

| 字段 | 类型 | 说明 |
|------|------|------|
| timestamp | ISO8601 | 采集时间戳 |
| fruit_type | string | 水果类型 (apple/banana/orange/tangerine等) |
| maturity_label | string | 成熟度标签 |
| ethanol_adc | int | 乙醇传感器ADC值 (0-4095) |
| ethylene_voltage_v | float | 乙烯传感器电压 (0-3.3V) |
| tvoc_mg_m3 | float | 总挥发性有机物 (mg/m³) |
| hcho_mg_m3 | float | 甲醛浓度 (mg/m³) |
| co2_ppm | int | 二氧化碳浓度 (ppm) |
| aqi | int | 空气质量指数 (1-5) |
| temperature_c | float | 温度 (°C) |
| humidity_percent | float | 相对湿度 (%) |

### 成熟度标签体系

**三分类 (成熟度)**:
- `unripe` - 未成熟
- `ripe` - 成熟
- `overripe` - 过熟

**二分类 (新鲜度)**:
- `fresh` - 新鲜
- `not_fresh` - 不新鲜

### 支持的水果类型
- apple (苹果)
- banana (香蕉)
- orange (橙子)
- grape (葡萄)
- strawberry (草莓)
- mango (芒果)
- tangerine (小橘子)

---

## 五、已采集数据

### 数据汇总

| 文件 | 水果 | 标签 | 记录数 | 采集日期 |
|------|------|------|--------|----------|
| fruit_train_data_20251221_1800.csv | tangerine | fresh | 240 | 2025-12-21 |
| fruit_train_data_20251221_2212.csv | tangerine | fresh | 240 | 2025-12-21 |
| fruit_train_data_20251223_1429.csv | banana | unripe | 240 | 2025-12-23 |

### 传感器数据特征对比

| 水果/状态 | ethanol_adc | ethylene_voltage |
|-----------|-------------|------------------|
| 橘子/新鲜 | 2952-3089 | 0.69-0.95V |
| 香蕉/未成熟 | 3043-3092 | 0.46-0.50V |

**关键发现**: 乙烯电压是区分成熟度的重要特征，未成熟水果乙烯释放量明显较低。

---

## 六、待完成工作

### 数据采集
- [ ] 香蕉 ripe (成熟) 数据
- [ ] 香蕉 overripe (过熟) 数据
- [ ] 橘子 not_fresh (不新鲜) 数据 - 等待橘子变质
- [ ] 更多水果种类数据

### 模型开发
- [ ] 数据预处理和特征工程
- [ ] 选择合适的机器学习算法 (推荐: 随机森林、SVM、小型神经网络)
- [ ] 模型训练和验证
- [ ] 使用TensorFlow Lite Micro转换模型
- [ ] 在STM32上部署推理

### 系统完善
- [ ] 完善OLED界面显示推理结果
- [ ] 添加本地数据存储 (SD卡)
- [ ] 优化功耗

---

## 七、开发注意事项

### 数据采集建议
- 每种状态采集200-300条数据
- 每次采集15-20分钟
- 采集间隔5-6秒
- 使用3-5个同类水果增加样本多样性
- 保持环境温湿度相对稳定

### 代码修改注意
- 嵌入式代码在 `keil_fruit/` 目录
- 云端代码在 `上云/` 目录
- WebSocket地址: `ws://139.159.209.44:8080`
- 修改后需要通过scp上传到服务器并重启PM2

### 关键文件路径
- 传感器解析: `keil_fruit/App/uart_app.c`
- 任务调度: `keil_fruit/App/scheduler.c`
- 前端采集页: `上云/client/train.html`
- 采集逻辑: `上云/client/js/train-app.js`
- 服务器: `上云/server/index.js`

---

## 八、项目背景

### 学术目标
- 本科毕业设计
- 计划投稿SCI/EI期刊或中文核心期刊
- 申请实用新型专利

### 技术创新点
1. 多传感器融合 (乙醇+乙烯+TVOC+HCHO+CO2)
2. 边缘AI推理 (TinyML on STM32)
3. 低成本方案 (相比光谱仪等专业设备)
4. 实时无损检测

---

## 九、常见问题

### Q: 为什么用ADC值而不是ppm?
A: 乙醇传感器的ppm值经过内部换算，精度损失较大。直接使用ADC原始值保留更多信息，有利于机器学习。

### Q: 乙烯传感器为什么用电压?
A: 乙烯传感器输出模拟电压信号，通过STM32的ADC采集后换算为电压值。电压与乙烯浓度成正比。

### Q: 如何判断水果成熟度?
A: 主要依据乙烯释放量。水果成熟过程中会释放乙烯，成熟度越高释放量越大。结合其他气体特征可以更准确判断。

---

*文档更新日期: 2025-12-23*
*项目状态: 数据采集阶段*
