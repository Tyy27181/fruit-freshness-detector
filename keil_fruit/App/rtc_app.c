#include "rtc_app.h"

// Current time cache
static rtc_time_t current_time;

// Weekday string (Chinese)
static const char* weekday_str[] = {
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
};

/**
 * @brief RTC app init
 */
void rtc_app_init(void)
{

}

/**
 * @brief Get current RTC time
 * @param time: output time struct pointer
 */
void rtc_get_time(rtc_time_t *time)
{
    RTC_TimeTypeDef sTime = {0};
    RTC_DateTypeDef sDate = {0};

    // Read time first, then date (HAL requirement)
    HAL_RTC_GetTime(&hrtc, &sTime, RTC_FORMAT_BIN);
    HAL_RTC_GetDate(&hrtc, &sDate, RTC_FORMAT_BIN);

    time->hours   = sTime.Hours;
    time->minutes = sTime.Minutes;
    time->seconds = sTime.Seconds;
    time->weekday = sDate.WeekDay;
    time->date    = sDate.Date;
    time->month   = sDate.Month;
    time->year    = 2000 + sDate.Year;
}

/**
 * @brief Set RTC time
 * @param hours: hour (0-23)
 * @param minutes: minute (0-59)
 * @param seconds: second (0-59)
 */
void rtc_set_time(uint8_t hours, uint8_t minutes, uint8_t seconds)
{
    RTC_TimeTypeDef sTime = {0};

    sTime.Hours   = hours;
    sTime.Minutes = minutes;
    sTime.Seconds = seconds;
    sTime.DayLightSaving = RTC_DAYLIGHTSAVING_NONE;
    sTime.StoreOperation = RTC_STOREOPERATION_RESET;

    HAL_RTC_SetTime(&hrtc, &sTime, RTC_FORMAT_BIN);
}

/**
 * @brief Set RTC date
 * @param year: year (2000-2099)
 * @param month: month (1-12)
 * @param date: date (1-31)
 * @param weekday: weekday (1=Mon, 7=Sun)
 */
void rtc_set_date(uint16_t year, uint8_t month, uint8_t date, uint8_t weekday)
{
    RTC_DateTypeDef sDate = {0};

    sDate.Year    = year - 2000;
    sDate.Month   = month;
    sDate.Date    = date;
    sDate.WeekDay = weekday;

    HAL_RTC_SetDate(&hrtc, &sDate, RTC_FORMAT_BIN);
}

/**
 * @brief Get formatted time string
 * @param buf: output buffer (at least 9 bytes)
 * @return format: "HH:MM:SS"
 */
void rtc_get_time_str(char *buf)
{
    rtc_time_t time;
    rtc_get_time(&time);
    sprintf(buf, "%02d:%02d:%02d", time.hours, time.minutes, time.seconds);
}

/**
 * @brief Get formatted date string
 * @param buf: output buffer (at least 11 bytes)
 * @return format: "YYYY-MM-DD"
 */
void rtc_get_date_str(char *buf)
{
    rtc_time_t time;
    rtc_get_time(&time);
    sprintf(buf, "%04d-%02d-%02d", time.year, time.month, time.date);
}

/**
 * @brief Get formatted datetime string
 * @param buf: output buffer (at least 20 bytes)
 * @return format: "YYYY-MM-DD HH:MM:SS"
 */
void rtc_get_datetime_str(char *buf)
{
    rtc_time_t time;
    rtc_get_time(&time);
    sprintf(buf, "%04d-%02d-%02d %02d:%02d:%02d",
            time.year, time.month, time.date,
            time.hours, time.minutes, time.seconds);
}

/**
 * @brief Get weekday string
 * @param weekday: weekday (1=Mon, 7=Sun, 0=Sun)
 * @return weekday string
 */
const char* rtc_get_weekday_str(uint8_t weekday)
{
    if (weekday == 0 || weekday > 7) {
        return weekday_str[0];
    }
    if (weekday == 7) {
        return weekday_str[0];
    }
    return weekday_str[weekday];
}

/**
 * @brief Print current time via UART
 * @param huart: UART handle
 */
void rtc_print_time(UART_HandleTypeDef *huart)
{
    rtc_time_t time;
    rtc_get_time(&time);

    my_printf(huart, "RTC:%04d-%02d-%02d %02d:%02d:%02d %s\r\n",
              time.year, time.month, time.date,
              time.hours, time.minutes, time.seconds,
              rtc_get_weekday_str(time.weekday));
}

/**
 * @brief RTC periodic task (call in scheduler)
 */
void rtc_task(void)
{
  rtc_get_time(&current_time);
    // rtc_print_time(&huart6);
}
