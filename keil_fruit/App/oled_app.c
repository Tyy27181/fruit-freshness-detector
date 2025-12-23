#include "oled_app.h"

int Oled_Printf(uint8_t x, uint8_t y, const char *format, ...)
{
	char buffer[128]; // 缓冲区大小根据需要调整
	va_list arg;
	int len;

	va_start(arg, format);
	len = vsnprintf(buffer, sizeof(buffer), format, arg);
	va_end(arg);

	// 假设 OLED_ShowStr 使用像素坐标 x 和字符行 y
	OLED_ShowStr(x, y, buffer, 8); // 将 buffer 转为 uint8_t*
	return len;
}

void oled_task(void)
{
	Oled_Printf(1,1,"hello");
}

