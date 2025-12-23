#include "key_app.h"

uint8_t key_val = 0;  // 当前按键状态
uint8_t key_old = 0;  // 前一按键状态
uint8_t key_down = 0; // 按下的按键
uint8_t key_up = 0;   // 释放的按键

/**
 * @brief 读取按键状态
 *
 * 该函数读取连接在 GPIO 引脚上的按键状态，并返回相应的按键编号。
 *
 * @return 返回按键编号。0 表示没有按键按下，1-4 表示对应的按键被按下。
 */
uint8_t key_read(void)
{
  // 用于存储按键状态的临时变量
  uint8_t temp = 0;

  // 检查 GPIOB 引脚 0 的状态
  if (HAL_GPIO_ReadPin(GPIOD, GPIO_PIN_0) == GPIO_PIN_RESET)
    temp = 1; // 如果引脚状态为 RESET，则按键 1 被按下

//  // 检查 GPIOB 引脚 1 的状态
//  if (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_1) == GPIO_PIN_RESET)
//    temp = 2; // 如果引脚状态为 RESET，则按键 2 被按下

//  // 检查 GPIOB 引脚 2 的状态
//  if (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_2) == GPIO_PIN_RESET)
//    temp = 3; // 如果引脚状态为 RESET，则按键 3 被按下

//  // 检查 GPIOA 引脚 0 的状态
//  if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == GPIO_PIN_RESET)
//    temp = 4; // 如果引脚状态为 RESET，则按键 4 被按下

  // 返回检测到的按键编号
  return temp;
}

/**
 * @brief 按键处理函数
 *
 * 该函数用于扫描按键的状态，并更新按键按下和释放的标志
 */
void key_proc(void)
{
  // 读取当前按键状态
  key_val = key_read();
  // 计算按下的按键（当前按下状态与前一状态异或，并与当前状态相与）
  key_down = key_val & (key_old ^ key_val);
  // 计算释放的按键（当前未按下状态与前一状态异或，并与前一状态相与）
  key_up = ~key_val & (key_old ^ key_val);
  // 更新前一按键状态
  key_old = key_val;
	switch(key_down)
	{
		case 1:
		ucLed[1] = 1;
		break;
	}
}

