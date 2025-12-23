#include "uart_app.h"
#include "ringbuffer.h"

#define BUFFER_SIZE 128

uint8_t static_buffer[BUFFER_SIZE];
uint8_t web_static_buffer[BUFFER_SIZE];
uint8_t uart3_static_buffer[BUFFER_SIZE];  // USART3 ringbuffer
uint8_t uart6_static_buffer[BUFFER_SIZE];  // USART6 ringbuffer

struct rt_ringbuffer rb;
struct rt_ringbuffer web_rb;
struct rt_ringbuffer uart3_rb;
struct rt_ringbuffer uart6_rb;

uint8_t uart_rx_dma_buffer[128] = {0};
uint8_t uart_dma_buffer[128] = {0};

uint8_t web_uart_rx_dma_buffer[128] = {0};
uint8_t web_uart_dma_buffer[128] = {0};

uint8_t uart3_rx_dma_buffer[128] = {0};
uint8_t uart3_dma_buffer[128] = {0};

uint8_t uart6_rx_dma_buffer[128] = {0};
uint8_t uart6_dma_buffer[128] = {0};

void buffer_init(void)
{
  rt_ringbuffer_init(&rb, static_buffer, BUFFER_SIZE);
	rt_ringbuffer_init(&web_rb, web_static_buffer, BUFFER_SIZE);
	rt_ringbuffer_init(&uart3_rb, uart3_static_buffer, BUFFER_SIZE);
	rt_ringbuffer_init(&uart6_rb, uart6_static_buffer, BUFFER_SIZE);
}

int my_printf(UART_HandleTypeDef *huart, const char *format, ...)
{
	char buffer[512];
	va_list arg;      
	int len;          

	va_start(arg, format);

	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);


	HAL_UART_Transmit(huart, (uint8_t *)buffer, (uint16_t)len, 0xFF);
	return len;
}


void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)
{
    if (huart->Instance == USART1)
    {
    HAL_UART_DMAStop(huart);
    rt_ringbuffer_put(&rb,uart_rx_dma_buffer,Size);
    memset(uart_rx_dma_buffer, 0, sizeof(uart_rx_dma_buffer));
    HAL_UARTEx_ReceiveToIdle_DMA(&huart1,uart_rx_dma_buffer, sizeof(uart_rx_dma_buffer));
     __HAL_DMA_DISABLE_IT(&hdma_usart1_rx, DMA_IT_HT);
    }
		
		if (huart->Instance == USART2)
    {
    HAL_UART_DMAStop(huart);
    rt_ringbuffer_put(&web_rb,web_uart_rx_dma_buffer,Size);
    memset(web_uart_rx_dma_buffer, 0, sizeof(web_uart_rx_dma_buffer));
    HAL_UARTEx_ReceiveToIdle_DMA(&huart2,web_uart_rx_dma_buffer,sizeof(web_uart_rx_dma_buffer));
     __HAL_DMA_DISABLE_IT(&hdma_usart2_rx, DMA_IT_HT);
    }

		if (huart->Instance == USART3)
    {
    HAL_UART_DMAStop(huart);
    rt_ringbuffer_put(&uart3_rb,uart3_rx_dma_buffer,Size);
    memset(uart3_rx_dma_buffer, 0, sizeof(uart3_rx_dma_buffer));
    HAL_UARTEx_ReceiveToIdle_DMA(&huart3,uart3_rx_dma_buffer,sizeof(uart3_rx_dma_buffer));
     __HAL_DMA_DISABLE_IT(&hdma_usart3_rx, DMA_IT_HT);
    }

		if (huart->Instance == USART6)
    {
    HAL_UART_DMAStop(huart);
    rt_ringbuffer_put(&uart6_rb,uart6_rx_dma_buffer,Size);
    memset(uart6_rx_dma_buffer, 0, sizeof(uart6_rx_dma_buffer));
    HAL_UARTEx_ReceiveToIdle_DMA(&huart6,uart6_rx_dma_buffer,sizeof(uart6_rx_dma_buffer));
     __HAL_DMA_DISABLE_IT(&hdma_usart6_rx, DMA_IT_HT);
    }
}

#define SENSOR_FRAME_HEAD0   0x2C
#define SENSOR_FRAME_HEAD1   0xE4
#define SENSOR_FRAME_LEN     14   // B0~B12 + CHECKSUM


int sensor_parse_frame(const uint8_t *buf, sensor_frame_t *out)
{
    if (buf == NULL || out == NULL) return -1;

    if (buf[0] != SENSOR_FRAME_HEAD0 || buf[1] != SENSOR_FRAME_HEAD1)
        return -2;


    uint16_t sum = 0;
    for (int i = 0; i <= 12; i++)
    {
        sum += buf[i];
    }
    uint8_t checksum = (uint8_t)(sum & 0xFF);
    if (checksum != buf[13])
        return -3;
    uint16_t tvoc_raw = (uint16_t)buf[3] * 256u + buf[2];

    uint16_t hcho_raw = (uint16_t)buf[5] * 256u + buf[4];

    uint16_t co2      = (uint16_t)buf[7] * 256u + buf[6];

    uint8_t  aqi      = buf[8];

    float    temp     = (float)buf[10] + ((float)buf[9] / 10.0f);

    float    humi     = (float)buf[12] + ((float)buf[11] / 10.0f);

    out->tvoc_raw     = tvoc_raw;
    out->tvoc_mg_m3   = tvoc_raw * 0.001f;

    out->hcho_raw     = hcho_raw;
    out->hcho_mg_m3   = hcho_raw * 0.001f;

    out->co2_ppm      = co2;
    out->aqi          = aqi;
    out->temp_c       = temp;
    out->humi_percent = humi;

    return 0;
}

void sensor_process_buffer(const uint8_t *buf, uint16_t len)
{
    uint16_t i = 0;
    while (i + SENSOR_FRAME_LEN <= len)
    {
        if (buf[i] == SENSOR_FRAME_HEAD0 && buf[i + 1] == SENSOR_FRAME_HEAD1)
        {
            sensor_frame_t frame;
            int ret = sensor_parse_frame(&buf[i], &frame);
            if (ret == 0)
            {

                my_printf(&huart6,
                         "TVOC:%.3fmg/m3 HCHO:%.3fmg/m3 CO2:%dppm AQI:%d T:%.1fC H:%.1f%%\r\n",
                         frame.tvoc_mg_m3,
                         frame.hcho_mg_m3,
                         frame.co2_ppm,
                         frame.aqi,
                         frame.temp_c,
                         frame.humi_percent);

                i += SENSOR_FRAME_LEN;
                continue;
            }
        }

        i++;
    }
}

#define ETHANOL_FRAME_HEAD     0xFE
#define ETHANOL_FRAME_LEN      11    // Byte0 ~ Byte10

ethanol_frame_t g_ethanol_data = {0};

/**
 * 校验和计算: 根据手册 V1.1
 * 校验值 = Byte3 + Byte4 + ... + Byte8
 */
static uint8_t ethanol_calc_checksum(const uint8_t *buf)
{
    uint8_t sum = 0;
    // 累加 Byte 3 到 Byte 8
    for (int i = 3; i <= 8; i++)
    {
        sum += buf[i];
    }
    return sum;
}

/**
 * 解析乙醇传感器数据帧
 * @param buf  指向11字节缓冲区
 * @param out  输出结构体
 * @return 0 成功; <0 失败
 */
int ethanol_parse_frame(const uint8_t *buf, ethanol_frame_t *out)
{
    if (buf == NULL || out == NULL) return -1;

    // 1. 帧头检查 (Byte 0)
    if (buf[0] != ETHANOL_FRAME_HEAD)
        return -2;

    // 2. 校验和验证 (Byte 9)
    uint8_t checksum = ethanol_calc_checksum(buf);
    if (checksum != buf[9])
        return -3;

    // 3. 数据解析
    // [修正]: 报警位在 Byte 4 (之前误判为 Byte 3)
    out->alarm = buf[4];

    // 浓度值: (Byte5 * 256 + Byte6) / 100
    // [确认]: Byte5=High(0x18), Byte6=Low(0x09) -> 61.53ppm
    uint16_t conc_raw = ((uint16_t)buf[5] << 8) | buf[6];
    out->concentration_ppm = (float)conc_raw / 100.0f;

    // ADC值: Byte7 * 256 + Byte8
    out->adc_val = ((uint16_t)buf[7] << 8) | buf[8];

    return 0;
}

/**
 * 从缓冲区中搜索并解析乙醇传感器帧
 */
void ethanol_process_buffer(const uint8_t *buf, uint16_t len)
{
    uint16_t i = 0;
    // 确保剩余数据足够一个完整帧长度
    while (i + ETHANOL_FRAME_LEN <= len)
    {
        if (buf[i] == ETHANOL_FRAME_HEAD)
        {
            ethanol_frame_t frame;
            int ret = ethanol_parse_frame(&buf[i], &frame);
            if (ret == 0)
            {
                // 保存到全局变量
                g_ethanol_data = frame;

                // 调试输出
                my_printf(&huart6, "Ethanol: %.2f ppm (ADC: %d, Alarm: %d)\r\n",
                         frame.concentration_ppm,
                         frame.adc_val,
                         frame.alarm);

                i += ETHANOL_FRAME_LEN;
                continue;
            }
        }
        i++;
    }
}

void uart_proc(void)
{
	uint8_t Lengh = rt_ringbuffer_data_len(&rb);
	if(Lengh == 0) return;
	rt_ringbuffer_get(&rb,uart_dma_buffer,Lengh);
	//my_printf(&huart1,"%s\r\n",uart_dma_buffer);
	memset(uart_dma_buffer, 0, sizeof(uart_dma_buffer));
}

void web_uart_proc(void)
{
	uint8_t Lengh = rt_ringbuffer_data_len(&web_rb);
	if(Lengh == 0) return; 
	rt_ringbuffer_get(&web_rb,web_uart_dma_buffer,Lengh);
	//my_printf(&huart1,"%s\r\n",web_uart_dma_buffer);
	sensor_process_buffer(web_uart_dma_buffer, Lengh);
	memset(web_uart_dma_buffer, 0, sizeof(web_uart_dma_buffer));
}

void uart3_proc(void)
{
	uint8_t Lengh = rt_ringbuffer_data_len(&uart3_rb);
	if(Lengh == 0) return;
	rt_ringbuffer_get(&uart3_rb,uart3_dma_buffer,Lengh);

	ethanol_process_buffer(uart3_dma_buffer, Lengh);

	memset(uart3_dma_buffer, 0, sizeof(uart3_dma_buffer));
}

void uart6_proc(void)
{
	uint8_t Lengh = rt_ringbuffer_data_len(&uart6_rb);
	if(Lengh == 0) return;
	rt_ringbuffer_get(&uart6_rb,uart6_dma_buffer,Lengh);

	//my_printf(&huart1,"%s\r\n",uart6_dma_buffer);
	memset(uart6_dma_buffer, 0, sizeof(uart6_dma_buffer));
}

