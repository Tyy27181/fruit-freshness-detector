#include "scheduler.h"



uint8_t task_num;

typedef struct {
    void (*task_func)(void);
    uint32_t rate_ms;
    uint32_t last_run;
} task_t;


static task_t scheduler_task[] =
{
	{web_uart_proc,1000,0},
	{uart_proc, 1, 0}, 
	{oled_task,10,0},
	{uart3_proc, 900, 0},
	{adc_task,1000,0},
	{uart6_proc,500,0},
	{led_proc,10,0},
	{key_proc,10,0}
 };


void scheduler_init(void)
{
    task_num = sizeof(scheduler_task) / sizeof(task_t);
}


void scheduler_run(void)
{

    for (uint8_t i = 0; i < task_num; i++)
    {
        uint32_t now_time = HAL_GetTick();
        if (now_time >= scheduler_task[i].rate_ms + scheduler_task[i].last_run)
        {
            scheduler_task[i].last_run = now_time;
            scheduler_task[i].task_func();
        }
    }
}


