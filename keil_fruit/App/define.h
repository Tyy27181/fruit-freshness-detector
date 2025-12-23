#include "main.h"
#include "math.h"

#include "stdio.h"
#include "string.h"
#include "stdarg.h"

#include "uart_app.h"
#include "scheduler.h"
#include "oled_app.h"
#include "oled_font.h"
#include "oled.h"
#include "adc_app.h"
#include "rtc_app.h"
#include "led_app.h"
#include "md25q64_test.h"
#include "md25q64.h"
#include "key_app.h"

extern DMA_HandleTypeDef hdma_usart1_rx;
extern UART_HandleTypeDef huart1;
extern DMA_HandleTypeDef hdma_usart2_rx;
extern UART_HandleTypeDef huart2;
extern DMA_HandleTypeDef hdma_usart3_rx;
extern UART_HandleTypeDef huart3;
extern DMA_HandleTypeDef hdma_usart6_rx;
extern UART_HandleTypeDef huart6;

extern uint8_t uart_rx_dma_buffer[128];
extern uint8_t uart_dma_buffer[128];
extern uint8_t web_uart_rx_dma_buffer[128];
extern uint8_t web_uart_dma_buffer[128];
extern uint8_t uart3_rx_dma_buffer[128];
extern uint8_t uart3_dma_buffer[128];
extern uint8_t uart6_rx_dma_buffer[128];
extern uint8_t uart6_dma_buffer[128];
extern uint8_t ucLed[3];

