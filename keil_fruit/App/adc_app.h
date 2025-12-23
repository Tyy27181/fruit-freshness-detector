#ifndef ADC_APP_H
#define ADC_APP_H

#include "define.h"

void adc_dma_init(void);//初始化函数
void adc_task(void);//任务函数
float Ethylene_CalculatePPM(float voltage_v, float r0_kohm);

extern DMA_HandleTypeDef hdma_adc1;
extern ADC_HandleTypeDef hadc1;

#endif


