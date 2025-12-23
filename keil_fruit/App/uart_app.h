#ifndef UART_APP_H
#define UART_APP_H

#include "define.h"
#include "ringbuffer.h"

typedef struct
{
    uint16_t tvoc_raw;      
    float    tvoc_mg_m3;    

    uint16_t hcho_raw;      
    float    hcho_mg_m3;    

    uint16_t co2_ppm;       
    uint8_t  aqi;           

    float    temp_c;        
    float    humi_percent;  
} sensor_frame_t;

typedef struct
{
    uint8_t  alarm;             // 报警位 (Byte3): 0x01报警, 0x00正常
    float    concentration_ppm; // 乙醇浓度 (ppm)
    uint16_t adc_val;           // ADC原始值
} ethanol_frame_t;

extern ethanol_frame_t g_ethanol_data;

int  sensor_parse_frame(const uint8_t *buf, sensor_frame_t *out);
void sensor_process_buffer(const uint8_t *buf, uint16_t len);

int ethanol_parse_frame(const uint8_t *buf, ethanol_frame_t *out);
void ethanol_process_buffer(const uint8_t *buf, uint16_t len);

int my_printf(UART_HandleTypeDef *huart, const char *format, ...);
void uart_proc(void);
void buffer_init(void);
void web_uart_proc(void);
void uart3_proc(void);
void uart6_proc(void);
#endif

