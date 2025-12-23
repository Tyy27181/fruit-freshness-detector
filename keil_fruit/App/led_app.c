#include "led_app.h"

// LED 状态数组，3个LED对应PC0、PC1、PC2
uint8_t ucLed[3] = {0,0,1};

/**
 * @brief 设置单个LED状态
 *
 * @param led_index LED索引 (0-2 对应 PC0-PC2)
 * @param state 状态 (1=亮, 0=灭)
 */
void led_set(uint8_t led_index, uint8_t state)
{
    if (led_index > 2)
        return;

    ucLed[led_index] = state ? 1 : 0;
}

/**
 * @brief 切换单个LED状态
 *
 * @param led_index LED索引 (0-2 对应 PC0-PC2)
 */
void led_toggle(uint8_t led_index)
{
    if (led_index > 2)
        return;

    ucLed[led_index] = !ucLed[led_index];
}

/**
 * @brief 设置所有LED状态
 *
 * @param state 状态 (1=全亮, 0=全灭)
 */
void led_set_all(uint8_t state)
{
    for (int i = 0; i < 3; i++)
    {
        ucLed[i] = state ? 1 : 0;
    }
}

/**
 * @brief LED 显示更新函数
 *
 * 根据 ucLed 数组的值更新实际LED输出
 * PC0/PC1/PC2: 给1是亮
 */
void led_disp(uint8_t *ucLed)
{
    static uint8_t temp_old = 0xff;
    uint8_t temp = 0;

    // 计算当前状态
    for (int i = 0; i < 3; i++)
    {
        if (ucLed[i])
            temp |= (1 << i);
    }

    // 状态有变化时才更新
    if (temp != temp_old)
    {
        // PC0
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_0, ucLed[0] ? GPIO_PIN_SET : GPIO_PIN_RESET);
        // PC1
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_1, ucLed[1] ? GPIO_PIN_SET : GPIO_PIN_RESET);
        // PC2
        HAL_GPIO_WritePin(GPIOC, GPIO_PIN_2, ucLed[2] ? GPIO_PIN_SET : GPIO_PIN_RESET);

        temp_old = temp;
    }
}

/**
 * @brief LED 处理函数
 *
 * 周期调用，更新LED显示
 */
void led_proc(void)
{
  led_disp(ucLed);
	
}
