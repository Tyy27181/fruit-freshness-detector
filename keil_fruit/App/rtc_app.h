#ifndef RTC_APP_H
#define RTC_APP_H

#include "define.h"
#include "rtc.h"

// RTC time structure
typedef struct {
    uint8_t hours;      // hour (0-23)
    uint8_t minutes;    // minute (0-59)
    uint8_t seconds;    // second (0-59)
    uint8_t weekday;    // weekday (1-7, 1=Monday)
    uint8_t date;       // date (1-31)
    uint8_t month;      // month (1-12)
    uint16_t year;      // year (2000-2099)
} rtc_time_t;

// Init RTC app
void rtc_app_init(void);

// Get current time
void rtc_get_time(rtc_time_t *time);

// Set time (hour, min, sec)
void rtc_set_time(uint8_t hours, uint8_t minutes, uint8_t seconds);

// Set date (year, month, date, weekday)
void rtc_set_date(uint16_t year, uint8_t month, uint8_t date, uint8_t weekday);

// Get time string "HH:MM:SS"
void rtc_get_time_str(char *buf);

// Get date string "YYYY-MM-DD"
void rtc_get_date_str(char *buf);

// Get datetime string "YYYY-MM-DD HH:MM:SS"
void rtc_get_datetime_str(char *buf);

// Get weekday string (Chinese)
const char* rtc_get_weekday_str(uint8_t weekday);

// Print current time via UART
void rtc_print_time(UART_HandleTypeDef *huart);

// RTC periodic task (call in scheduler)
void rtc_task(void);

#endif
