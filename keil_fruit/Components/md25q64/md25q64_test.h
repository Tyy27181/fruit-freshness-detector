/**
 * @file    md25q64_test.h
 * @brief   MD25Q64 Flash Test Header
 */

#ifndef __MD25Q64_TEST_H__
#define __MD25Q64_TEST_H__

#ifdef __cplusplus
extern "C" {
#endif

#include "md25q64.h"

/**
 * @brief  Initialize Flash test module
 * @retval 0: Success, -1: Failed
 */
int MD25Q64_Test_Init(void);

/**
 * @brief  Run all Flash tests
 * @note   Results will be printed via USART1
 */
void MD25Q64_Test_RunAll(void);

/**
 * @brief  Test: Read JEDEC ID
 * @retval 0: Pass, -1: Fail
 */
int MD25Q64_Test_ReadID(void);

/**
 * @brief  Test: Read/Write single sector
 * @retval 0: Pass, -1: Fail
 */
int MD25Q64_Test_ReadWrite(void);

/**
 * @brief  Test: Speed measurement
 * @retval 0: Pass, -1: Fail
 */
int MD25Q64_Test_Speed(void);

/**
 * @brief  Get Flash handle for external use
 * @retval Pointer to MD25Q64_Handle
 */
MD25Q64_Handle* MD25Q64_Test_GetHandle(void);

#ifdef __cplusplus
}
#endif

#endif /* __MD25Q64_TEST_H__ */
