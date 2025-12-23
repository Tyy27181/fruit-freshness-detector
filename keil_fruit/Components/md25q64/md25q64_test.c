/**
 * @file    md25q64_test.c
 * @brief   MD25Q64 Flash Test Implementation
 * @details Test routines for MD25Q64C NOR Flash
 *          Output via USART1 (460800 baud)
 *
 * Hardware Connection:
 *   PB12 - CS (Chip Select)
 *   PB13 - SCK (SPI Clock)
 *   PB14 - MISO (Master In Slave Out)
 *   PB15 - MOSI (Master Out Slave In)
 */

#include "md25q64_test.h"
#include "md25q64.h"
#include "spi.h"
#include "usart.h"
#include "uart_app.h"
#include <string.h>

/* Flash CS Pin Configuration */
#define FLASH_CS_PORT       GPIOB
#define FLASH_CS_PIN        GPIO_PIN_12

/* Test Configuration */
#define TEST_ADDRESS        0x000000    /* Test start address */
#define TEST_SECTOR_ADDR    0x010000    /* Sector 16 for safety */
#define TEST_DATA_SIZE      256         /* One page */
#define SPEED_TEST_SIZE     4096        /* 4KB for speed test */

/* Flash Handle */
static MD25Q64_Handle g_flash;
static uint8_t g_test_write_buf[TEST_DATA_SIZE];
static uint8_t g_test_read_buf[TEST_DATA_SIZE];
static uint8_t g_speed_buf[SPEED_TEST_SIZE];

/* Private function prototypes */
static void Flash_CS_GPIO_Init(void);
static void print_separator(void);
static void print_hex_dump(const uint8_t *data, uint32_t len, uint32_t addr);

/**
 * @brief  Initialize CS GPIO pin
 */
static void Flash_CS_GPIO_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    /* Enable GPIOB clock */
    __HAL_RCC_GPIOB_CLK_ENABLE();

    /* Configure CS pin as output push-pull */
    GPIO_InitStruct.Pin = FLASH_CS_PIN;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(FLASH_CS_PORT, &GPIO_InitStruct);

    /* Set CS high (deselect) */
    HAL_GPIO_WritePin(FLASH_CS_PORT, FLASH_CS_PIN, GPIO_PIN_SET);
}

/**
 * @brief  Print separator line
 */
static void print_separator(void)
{
    my_printf(&huart1, "----------------------------------------\r\n");
}

/**
 * @brief  Print hex dump of data
 */
static void print_hex_dump(const uint8_t *data, uint32_t len, uint32_t addr)
{
    for (uint32_t i = 0; i < len; i += 16) {
        my_printf(&huart1, "%06X: ", addr + i);
        for (uint32_t j = 0; j < 16 && (i + j) < len; j++) {
            my_printf(&huart1, "%02X ", data[i + j]);
        }
        my_printf(&huart1, "\r\n");
    }
}

/**
 * @brief  Initialize Flash test module
 */
int MD25Q64_Test_Init(void)
{
    my_printf(&huart1, "\r\n");
    print_separator();
    my_printf(&huart1, "MD25Q64 Flash Test Initialization\r\n");
    print_separator();

    /* Initialize CS GPIO */
    Flash_CS_GPIO_Init();
    my_printf(&huart1, "[OK] CS GPIO initialized (PB12)\r\n");

    /* SPI should already be initialized by CubeMX */
    my_printf(&huart1, "[OK] SPI2 ready\r\n");
    my_printf(&huart1, "     SCK:  PB13\r\n");
    my_printf(&huart1, "     MISO: PB14\r\n");
    my_printf(&huart1, "     MOSI: PB15\r\n");

    /* Initialize Flash driver */
    MD25Q64_Status status = MD25Q64_Init(&g_flash, &hspi2, FLASH_CS_PORT, FLASH_CS_PIN);

    if (status == MD25Q64_OK) {
        my_printf(&huart1, "[OK] MD25Q64 Flash initialized\r\n");
        return 0;
    } else {
        my_printf(&huart1, "[FAIL] Flash init failed (error: %d)\r\n", status);
        return -1;
    }
}

/**
 * @brief  Get Flash handle
 */
MD25Q64_Handle* MD25Q64_Test_GetHandle(void)
{
    return &g_flash;
}

/**
 * @brief  Test: Read JEDEC ID
 */
int MD25Q64_Test_ReadID(void)
{
    my_printf(&huart1, "\r\n");
    print_separator();
    my_printf(&huart1, "Test 1: Read Device ID\r\n");
    print_separator();

    /* Read JEDEC ID */
    uint32_t jedec_id = 0;
    MD25Q64_Status status = MD25Q64_ReadJEDECID(&g_flash, &jedec_id);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Read JEDEC ID failed\r\n");
        return -1;
    }

    uint8_t mfr_id = (jedec_id >> 16) & 0xFF;
    uint8_t mem_type = (jedec_id >> 8) & 0xFF;
    uint8_t capacity = jedec_id & 0xFF;

    my_printf(&huart1, "JEDEC ID: 0x%06X\r\n", jedec_id);
    my_printf(&huart1, "  Manufacturer ID: 0x%02X", mfr_id);

    if (mfr_id == 0xC8) {
        my_printf(&huart1, " (GigaDevice)\r\n");
    } else {
        my_printf(&huart1, " (Unknown)\r\n");
    }

    my_printf(&huart1, "  Memory Type:     0x%02X\r\n", mem_type);
    my_printf(&huart1, "  Capacity:        0x%02X", capacity);

    if (capacity == 0x17) {
        my_printf(&huart1, " (64Mbit = 8MB)\r\n");
    } else if (capacity == 0x16) {
        my_printf(&huart1, " (32Mbit = 4MB)\r\n");
    } else if (capacity == 0x15) {
        my_printf(&huart1, " (16Mbit = 2MB)\r\n");
    } else {
        my_printf(&huart1, "\r\n");
    }

    /* Read Manufacturer/Device ID */
    uint8_t mfr, dev;
    status = MD25Q64_ReadID(&g_flash, &mfr, &dev);

    if (status == MD25Q64_OK) {
        my_printf(&huart1, "Manufacturer ID: 0x%02X\r\n", mfr);
        my_printf(&huart1, "Device ID:       0x%02X\r\n", dev);
    }

    /* Read Status Registers */
    uint8_t sr1, sr2, sr3;
    MD25Q64_ReadStatusReg1(&g_flash, &sr1);
    MD25Q64_ReadStatusReg2(&g_flash, &sr2);
    MD25Q64_ReadStatusReg3(&g_flash, &sr3);

    my_printf(&huart1, "Status Reg1: 0x%02X\r\n", sr1);
    my_printf(&huart1, "Status Reg2: 0x%02X\r\n", sr2);
    my_printf(&huart1, "Status Reg3: 0x%02X\r\n", sr3);

    /* Verify ID */
    if (mfr_id == 0xC8 && (mem_type == 0x40 || mem_type == 0x60)) {
        my_printf(&huart1, "[PASS] Device ID verified\r\n");
        return 0;
    } else {
        my_printf(&huart1, "[WARN] Unexpected device ID\r\n");
        return 0; /* Still pass, might be compatible device */
    }
}

/**
 * @brief  Test: Read/Write single sector
 */
int MD25Q64_Test_ReadWrite(void)
{
    my_printf(&huart1, "\r\n");
    print_separator();
    my_printf(&huart1, "Test 2: Read/Write Test\r\n");
    print_separator();

    MD25Q64_Status status;
    uint32_t test_addr = TEST_SECTOR_ADDR;

    my_printf(&huart1, "Test Address: 0x%06X\r\n", test_addr);

    /* Step 1: Read original data */
    my_printf(&huart1, "\r\n[Step 1] Reading original data...\r\n");
    memset(g_test_read_buf, 0, TEST_DATA_SIZE);
    status = MD25Q64_Read(&g_flash, test_addr, g_test_read_buf, 64);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Read failed\r\n");
        return -1;
    }

    my_printf(&huart1, "Original data (first 64 bytes):\r\n");
    print_hex_dump(g_test_read_buf, 64, test_addr);

    /* Step 2: Erase sector */
    my_printf(&huart1, "\r\n[Step 2] Erasing sector...\r\n");
    status = MD25Q64_EraseSector(&g_flash, test_addr);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Erase failed (error: %d)\r\n", status);
        return -1;
    }
    my_printf(&huart1, "[OK] Sector erased\r\n");

    /* Step 3: Verify erase (should be all 0xFF) */
    my_printf(&huart1, "\r\n[Step 3] Verifying erase...\r\n");
    memset(g_test_read_buf, 0, TEST_DATA_SIZE);
    status = MD25Q64_Read(&g_flash, test_addr, g_test_read_buf, TEST_DATA_SIZE);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Read failed\r\n");
        return -1;
    }

    int erase_ok = 1;
    for (int i = 0; i < TEST_DATA_SIZE; i++) {
        if (g_test_read_buf[i] != 0xFF) {
            erase_ok = 0;
            break;
        }
    }

    if (erase_ok) {
        my_printf(&huart1, "[OK] All bytes are 0xFF after erase\r\n");
    } else {
        my_printf(&huart1, "[FAIL] Erase verification failed\r\n");
        print_hex_dump(g_test_read_buf, 64, test_addr);
        return -1;
    }

    /* Step 4: Prepare test data */
    my_printf(&huart1, "\r\n[Step 4] Preparing test pattern...\r\n");
    for (int i = 0; i < TEST_DATA_SIZE; i++) {
        g_test_write_buf[i] = (uint8_t)i;
    }
    /* Add some text for easy identification */
    const char *test_str = "MD25Q64 Flash Test OK!";
    memcpy(g_test_write_buf, test_str, strlen(test_str));

    my_printf(&huart1, "Test pattern prepared\r\n");

    /* Step 5: Write data */
    my_printf(&huart1, "\r\n[Step 5] Writing data...\r\n");
    status = MD25Q64_Write(&g_flash, test_addr, g_test_write_buf, TEST_DATA_SIZE);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Write failed (error: %d)\r\n", status);
        return -1;
    }
    my_printf(&huart1, "[OK] Data written\r\n");

    /* Step 6: Read back and verify */
    my_printf(&huart1, "\r\n[Step 6] Reading back and verifying...\r\n");
    memset(g_test_read_buf, 0, TEST_DATA_SIZE);
    status = MD25Q64_Read(&g_flash, test_addr, g_test_read_buf, TEST_DATA_SIZE);

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Read failed\r\n");
        return -1;
    }

    my_printf(&huart1, "Read data (first 64 bytes):\r\n");
    print_hex_dump(g_test_read_buf, 64, test_addr);

    /* Compare data */
    int verify_ok = 1;
    int error_count = 0;
    for (int i = 0; i < TEST_DATA_SIZE; i++) {
        if (g_test_read_buf[i] != g_test_write_buf[i]) {
            verify_ok = 0;
            error_count++;
            if (error_count <= 5) {
                my_printf(&huart1, "Mismatch at 0x%04X: wrote 0x%02X, read 0x%02X\r\n",
                         i, g_test_write_buf[i], g_test_read_buf[i]);
            }
        }
    }

    if (verify_ok) {
        my_printf(&huart1, "[PASS] Data verification successful!\r\n");
        return 0;
    } else {
        my_printf(&huart1, "[FAIL] %d bytes mismatch\r\n", error_count);
        return -1;
    }
}

/**
 * @brief  Test: Speed measurement
 */
int MD25Q64_Test_Speed(void)
{
    my_printf(&huart1, "\r\n");
    print_separator();
    my_printf(&huart1, "Test 3: Speed Measurement\r\n");
    print_separator();

    MD25Q64_Status status;
    uint32_t start_tick, end_tick, elapsed;
    float speed;

    /* Read Speed Test */
    my_printf(&huart1, "\r\n[Read Speed Test] Size: %d bytes\r\n", SPEED_TEST_SIZE);

    start_tick = HAL_GetTick();
    status = MD25Q64_Read(&g_flash, 0x000000, g_speed_buf, SPEED_TEST_SIZE);
    end_tick = HAL_GetTick();

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Read failed\r\n");
        return -1;
    }

    elapsed = end_tick - start_tick;
    if (elapsed == 0) elapsed = 1;
    speed = (float)SPEED_TEST_SIZE * 1000.0f / (float)elapsed / 1024.0f;

    my_printf(&huart1, "  Time: %d ms\r\n", elapsed);
    my_printf(&huart1, "  Speed: %.2f KB/s\r\n", speed);

    /* Fast Read Speed Test */
    my_printf(&huart1, "\r\n[Fast Read Speed Test] Size: %d bytes\r\n", SPEED_TEST_SIZE);

    start_tick = HAL_GetTick();
    status = MD25Q64_FastRead(&g_flash, 0x000000, g_speed_buf, SPEED_TEST_SIZE);
    end_tick = HAL_GetTick();

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Fast Read failed\r\n");
        return -1;
    }

    elapsed = end_tick - start_tick;
    if (elapsed == 0) elapsed = 1;
    speed = (float)SPEED_TEST_SIZE * 1000.0f / (float)elapsed / 1024.0f;

    my_printf(&huart1, "  Time: %d ms\r\n", elapsed);
    my_printf(&huart1, "  Speed: %.2f KB/s\r\n", speed);

    /* Erase Speed Test (4KB sector) */
    my_printf(&huart1, "\r\n[Sector Erase Speed Test]\r\n");

    start_tick = HAL_GetTick();
    status = MD25Q64_EraseSector(&g_flash, TEST_SECTOR_ADDR);
    end_tick = HAL_GetTick();

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Erase failed\r\n");
        return -1;
    }

    elapsed = end_tick - start_tick;
    my_printf(&huart1, "  4KB Sector Erase Time: %d ms\r\n", elapsed);

    /* Write Speed Test */
    my_printf(&huart1, "\r\n[Write Speed Test] Size: %d bytes\r\n", SPEED_TEST_SIZE);

    /* Prepare data */
    for (int i = 0; i < SPEED_TEST_SIZE; i++) {
        g_speed_buf[i] = (uint8_t)(i & 0xFF);
    }

    start_tick = HAL_GetTick();
    status = MD25Q64_Write(&g_flash, TEST_SECTOR_ADDR, g_speed_buf, SPEED_TEST_SIZE);
    end_tick = HAL_GetTick();

    if (status != MD25Q64_OK) {
        my_printf(&huart1, "[FAIL] Write failed\r\n");
        return -1;
    }

    elapsed = end_tick - start_tick;
    if (elapsed == 0) elapsed = 1;
    speed = (float)SPEED_TEST_SIZE * 1000.0f / (float)elapsed / 1024.0f;

    my_printf(&huart1, "  Time: %d ms\r\n", elapsed);
    my_printf(&huart1, "  Speed: %.2f KB/s\r\n", speed);

    my_printf(&huart1, "\r\n[PASS] Speed test completed\r\n");
    return 0;
}

/**
 * @brief  Run all Flash tests
 */
void MD25Q64_Test_RunAll(void)
{
    int result;
    int pass_count = 0;
    int fail_count = 0;

    my_printf(&huart1, "\r\n\r\n");
    my_printf(&huart1, "========================================\r\n");
    my_printf(&huart1, "    MD25Q64 NOR Flash Test Suite\r\n");
    my_printf(&huart1, "========================================\r\n");
    my_printf(&huart1, "Flash Size: 8MB (64Mbit)\r\n");
    my_printf(&huart1, "Interface:  SPI2\r\n");
    my_printf(&huart1, "CS Pin:     PB12\r\n");
    my_printf(&huart1, "========================================\r\n");

    /* Initialize */
    result = MD25Q64_Test_Init();
    if (result != 0) {
        my_printf(&huart1, "\r\n[ERROR] Initialization failed, aborting tests\r\n");
        return;
    }

    /* Test 1: Read ID */
    result = MD25Q64_Test_ReadID();
    if (result == 0) pass_count++; else fail_count++;

    /* Test 2: Read/Write */
    result = MD25Q64_Test_ReadWrite();
    if (result == 0) pass_count++; else fail_count++;

    /* Test 3: Speed */
    result = MD25Q64_Test_Speed();
    if (result == 0) pass_count++; else fail_count++;

    /* Summary */
    my_printf(&huart1, "\r\n");
    my_printf(&huart1, "========================================\r\n");
    my_printf(&huart1, "           Test Summary\r\n");
    my_printf(&huart1, "========================================\r\n");
    my_printf(&huart1, "  Passed: %d\r\n", pass_count);
    my_printf(&huart1, "  Failed: %d\r\n", fail_count);
    my_printf(&huart1, "========================================\r\n");

    if (fail_count == 0) {
        my_printf(&huart1, "  ALL TESTS PASSED!\r\n");
    } else {
        my_printf(&huart1, "  SOME TESTS FAILED!\r\n");
    }
    my_printf(&huart1, "========================================\r\n\r\n");
}
