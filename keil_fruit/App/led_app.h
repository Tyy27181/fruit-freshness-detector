#ifndef __LED_APP_H__
#define __LED_APP_H__

#include "define.h"

// LED状态数组 (3个LED: PC0, PC1, PC2)
extern uint8_t ucLed[3];

// API函数
void led_set(uint8_t led_index, uint8_t state);  // 设置单个LED (index: 0-2, state: 1亮/0灭)
void led_toggle(uint8_t led_index);               // 切换单个LED
void led_set_all(uint8_t state);                  // 设置所有LED
void led_proc(void);                              // LED处理函数（周期调用）

#endif
