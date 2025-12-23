#include "adc_app.h"

#define ADC_CHANNEL_NUM     2       // ADC channel count
#define ADC_SAMPLE_NUM      16      // samples per channel
#define ADC_DMA_BUFFER_SIZE (ADC_CHANNEL_NUM * ADC_SAMPLE_NUM)

uint32_t adc_dma_buffer[ADC_DMA_BUFFER_SIZE];

// Channel 0 (PA0) - Ethylene sensor
__IO uint32_t adc_val_ch0;
__IO float voltage_ch0;

// Channel 1 (PA1) - Battery voltage
__IO uint32_t adc_val_ch1;
__IO float voltage_ch1;

void adc_dma_init(void)
{
    HAL_ADC_Start_DMA(&hadc1, (uint32_t*)adc_dma_buffer, ADC_DMA_BUFFER_SIZE);
}

#define SENSOR_VC       3.3f
#define SENSOR_RL       30.0f

#define FIT_PARAM_A     1.16f
#define FIT_PARAM_B     -2.35f

/**
 * @brief  Calculate ethylene PPM
 * @param  voltage_v: ADC voltage (V)
 * @param  r0_kohm: sensor R0 (kohm)
 * @return ethylene PPM
 */
float Ethylene_CalculatePPM(float voltage_v, float r0_kohm)
{
    if (voltage_v <= 0.01f || voltage_v >= SENSOR_VC - 0.01f) {
        return 0.0f;
    }

    float rs_kohm = SENSOR_RL * (SENSOR_VC - voltage_v) / voltage_v;

    if (r0_kohm <= 0.001f) return 0.0f;
    float ratio = rs_kohm / r0_kohm;

    if (ratio > 1.2f) {
        return 0.0f;
    }

    float ppm = FIT_PARAM_A * powf(ratio, FIT_PARAM_B);

    return ppm;
}

float sensor_rs = 0.0f;
float g_sensor_r0 = 105.2f;
float g_ethylene_ppm = 0.0f;
float charge_fruit_equipment = 0.0f;

void adc_task(void)
{
    uint32_t sum_ch0 = 0;
    uint32_t sum_ch1 = 0;

    // DMA buffer: [ch0, ch1, ch0, ch1, ch0, ch1, ...]
    for(uint16_t i = 0; i < ADC_DMA_BUFFER_SIZE; i += ADC_CHANNEL_NUM)
    {
        sum_ch0 += adc_dma_buffer[i];       // Channel 0 (PA0)
        sum_ch1 += adc_dma_buffer[i + 1];   // Channel 1 (PA1)
    }

    // Average
    adc_val_ch0 = sum_ch0 / ADC_SAMPLE_NUM;
    adc_val_ch1 = sum_ch1 / ADC_SAMPLE_NUM;

    // Convert to voltage (12bit, 3.3V ref)
    voltage_ch0 = ((float)adc_val_ch0 * 3.3f) / 4096.0f;
    voltage_ch1 = ((float)adc_val_ch1 * 3.3f) / 4096.0f;

    // Channel 0: Ethylene sensor
    g_ethylene_ppm = Ethylene_CalculatePPM(voltage_ch0, g_sensor_r0);

    // Channel 1: Battery voltage (modify formula as needed)
    // Example: if using voltage divider, multiply by ratio
		charge_fruit_equipment = voltage_ch1 * 11 / 7.4f * 100;
    // Print results
    my_printf(&huart6, "Vol:%.2fV, C2H4:%.2f PPM\r\n", voltage_ch0, g_ethylene_ppm);
    my_printf(&huart6, "charge_voltage:%.2f%%\r\n", charge_fruit_equipment);
}
