/**
 * @file    md25q64.h
 * @brief   MD25Q64C NOR Flash Driver Header
 * @details 64Mbit (8MB) SPI NOR Flash Driver
 *          Manufacturer: GigaDevice
 *          Support Standard/Dual/Quad SPI
 */

#ifndef __MD25Q64_H__
#define __MD25Q64_H__

#ifdef __cplusplus
extern "C" {
#endif

#include "main.h"

/* ============================================================================
 * Flash Memory Configuration
 * ============================================================================ */
#define MD25Q64_FLASH_SIZE          (8 * 1024 * 1024)   /* 8MB = 64Mbit */
#define MD25Q64_PAGE_SIZE           256                  /* 256 bytes per page */
#define MD25Q64_SECTOR_SIZE         (4 * 1024)          /* 4KB per sector */
#define MD25Q64_BLOCK_32K_SIZE      (32 * 1024)         /* 32KB per block */
#define MD25Q64_BLOCK_64K_SIZE      (64 * 1024)         /* 64KB per block */

#define MD25Q64_PAGE_COUNT          (MD25Q64_FLASH_SIZE / MD25Q64_PAGE_SIZE)
#define MD25Q64_SECTOR_COUNT        (MD25Q64_FLASH_SIZE / MD25Q64_SECTOR_SIZE)
#define MD25Q64_BLOCK_32K_COUNT     (MD25Q64_FLASH_SIZE / MD25Q64_BLOCK_32K_SIZE)
#define MD25Q64_BLOCK_64K_COUNT     (MD25Q64_FLASH_SIZE / MD25Q64_BLOCK_64K_SIZE)

/* ============================================================================
 * Manufacturer and Device ID
 * ============================================================================ */
#define MD25Q64_MANUFACTURER_ID     0xC8
#define MD25Q64_DEVICE_ID           0x16
#define MD25Q64_JEDEC_ID            0xC84017    /* MID=C8, Memory Type=40, Capacity=17 */

/* ============================================================================
 * Command Definitions (Standard SPI)
 * ============================================================================ */
/* Write Enable/Disable Commands */
#define MD25Q64_CMD_WRITE_ENABLE            0x06
#define MD25Q64_CMD_WRITE_DISABLE           0x04
#define MD25Q64_CMD_VOLATILE_SR_WRITE_EN    0x50

/* Status Register Commands */
#define MD25Q64_CMD_READ_STATUS_REG1        0x05
#define MD25Q64_CMD_READ_STATUS_REG2        0x35
#define MD25Q64_CMD_READ_STATUS_REG3        0x15
#define MD25Q64_CMD_WRITE_STATUS_REG1       0x01
#define MD25Q64_CMD_WRITE_STATUS_REG2       0x31
#define MD25Q64_CMD_WRITE_STATUS_REG3       0x11

/* Read Commands */
#define MD25Q64_CMD_READ_DATA               0x03
#define MD25Q64_CMD_FAST_READ               0x0B
#define MD25Q64_CMD_DUAL_OUTPUT_FAST_READ   0x3B
#define MD25Q64_CMD_QUAD_OUTPUT_FAST_READ   0x6B
#define MD25Q64_CMD_DUAL_IO_FAST_READ       0xBB
#define MD25Q64_CMD_QUAD_IO_FAST_READ       0xEB

/* Program Commands */
#define MD25Q64_CMD_PAGE_PROGRAM            0x02
#define MD25Q64_CMD_QUAD_PAGE_PROGRAM       0x32
#define MD25Q64_CMD_FAST_PAGE_PROGRAM       0xF2

/* Erase Commands */
#define MD25Q64_CMD_SECTOR_ERASE            0x20    /* 4KB */
#define MD25Q64_CMD_BLOCK_ERASE_32K         0x52    /* 32KB */
#define MD25Q64_CMD_BLOCK_ERASE_64K         0xD8    /* 64KB */
#define MD25Q64_CMD_CHIP_ERASE              0xC7    /* or 0x60 */
#define MD25Q64_CMD_CHIP_ERASE_ALT          0x60

/* Power Management Commands */
#define MD25Q64_CMD_DEEP_POWER_DOWN         0xB9
#define MD25Q64_CMD_RELEASE_POWER_DOWN      0xAB
#define MD25Q64_CMD_HIGH_PERFORMANCE_MODE   0xA3

/* ID Commands */
#define MD25Q64_CMD_READ_DEVICE_ID          0xAB
#define MD25Q64_CMD_READ_MFR_DEVICE_ID      0x90
#define MD25Q64_CMD_READ_JEDEC_ID           0x9F
#define MD25Q64_CMD_READ_MFR_DEVICE_ID_DUAL 0x92
#define MD25Q64_CMD_READ_MFR_DEVICE_ID_QUAD 0x94

/* Program/Erase Suspend/Resume Commands */
#define MD25Q64_CMD_PROG_ERASE_SUSPEND      0x75
#define MD25Q64_CMD_PROG_ERASE_RESUME       0x7A

/* Security Register Commands */
#define MD25Q64_CMD_ERASE_SECURITY_REG      0x44
#define MD25Q64_CMD_PROGRAM_SECURITY_REG    0x42
#define MD25Q64_CMD_READ_SECURITY_REG       0x48

/* Reset Commands */
#define MD25Q64_CMD_ENABLE_RESET            0x66
#define MD25Q64_CMD_RESET                   0x99

/* Wrap Command */
#define MD25Q64_CMD_SET_BURST_WITH_WRAP     0x77

/* SFDP Command */
#define MD25Q64_CMD_READ_SFDP               0x5A

/* ============================================================================
 * Status Register Bit Definitions
 * ============================================================================ */
/* Status Register 1 (05H) */
#define MD25Q64_SR1_WIP         (1 << 0)    /* Write In Progress */
#define MD25Q64_SR1_WEL         (1 << 1)    /* Write Enable Latch */
#define MD25Q64_SR1_BP0         (1 << 2)    /* Block Protect Bit 0 */
#define MD25Q64_SR1_BP1         (1 << 3)    /* Block Protect Bit 1 */
#define MD25Q64_SR1_BP2         (1 << 4)    /* Block Protect Bit 2 */
#define MD25Q64_SR1_BP3         (1 << 5)    /* Block Protect Bit 3 */
#define MD25Q64_SR1_BP4         (1 << 6)    /* Block Protect Bit 4 */
#define MD25Q64_SR1_SRP0        (1 << 7)    /* Status Register Protect 0 */

/* Status Register 2 (35H) */
#define MD25Q64_SR2_SRP1        (1 << 0)    /* Status Register Protect 1 */
#define MD25Q64_SR2_QE          (1 << 1)    /* Quad Enable */
#define MD25Q64_SR2_SUS2        (1 << 2)    /* Program Suspend */
#define MD25Q64_SR2_LB1         (1 << 3)    /* Security Register Lock Bit 1 */
#define MD25Q64_SR2_LB2         (1 << 4)    /* Security Register Lock Bit 2 */
#define MD25Q64_SR2_LB3         (1 << 5)    /* Security Register Lock Bit 3 */
#define MD25Q64_SR2_CMP         (1 << 6)    /* Complement Protect */
#define MD25Q64_SR2_SUS1        (1 << 7)    /* Erase Suspend */

/* Status Register 3 (15H) */
#define MD25Q64_SR3_DRV0        (1 << 5)    /* Driver Strength 0 */
#define MD25Q64_SR3_DRV1        (1 << 6)    /* Driver Strength 1 */
#define MD25Q64_SR3_HPF         (1 << 4)    /* High Performance Flag */

/* ============================================================================
 * Timing Parameters (in milliseconds)
 * ============================================================================ */
#define MD25Q64_TIMEOUT_PAGE_PROGRAM    10      /* Typ: 0.7ms, Max: 4ms */
#define MD25Q64_TIMEOUT_SECTOR_ERASE    500     /* Typ: 60ms, Max: 400ms */
#define MD25Q64_TIMEOUT_BLOCK_ERASE_32K 2500    /* Typ: 0.2s, Max: 2s */
#define MD25Q64_TIMEOUT_BLOCK_ERASE_64K 3000    /* Typ: 0.3s, Max: 2.5s */
#define MD25Q64_TIMEOUT_CHIP_ERASE      150000  /* Typ: 30s, Max: 120s */
#define MD25Q64_TIMEOUT_WRITE_SR        50      /* Typ: 5ms, Max: 30ms */
#define MD25Q64_TIMEOUT_DEFAULT         1000

/* ============================================================================
 * Error Codes
 * ============================================================================ */
typedef enum {
    MD25Q64_OK = 0,
    MD25Q64_ERROR,
    MD25Q64_BUSY,
    MD25Q64_TIMEOUT,
    MD25Q64_INVALID_PARAM,
    MD25Q64_WRITE_PROTECTED
} MD25Q64_Status;

/* ============================================================================
 * Hardware Configuration Structure
 * ============================================================================ */
typedef struct {
    SPI_HandleTypeDef *hspi;        /* SPI Handle */
    GPIO_TypeDef *cs_port;          /* CS Pin Port */
    uint16_t cs_pin;                /* CS Pin */
} MD25Q64_Handle;

/* ============================================================================
 * Function Prototypes - Initialization
 * ============================================================================ */

/**
 * @brief  Initialize MD25Q64 Flash
 * @param  handle: Flash handle pointer
 * @param  hspi: SPI handle pointer
 * @param  cs_port: CS GPIO port
 * @param  cs_pin: CS GPIO pin
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_Init(MD25Q64_Handle *handle, SPI_HandleTypeDef *hspi,
                             GPIO_TypeDef *cs_port, uint16_t cs_pin);

/* ============================================================================
 * Function Prototypes - ID Read
 * ============================================================================ */

/**
 * @brief  Read JEDEC ID (Manufacturer ID + Memory Type + Capacity)
 * @param  handle: Flash handle pointer
 * @param  jedec_id: Output JEDEC ID (3 bytes)
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadJEDECID(MD25Q64_Handle *handle, uint32_t *jedec_id);

/**
 * @brief  Read Manufacturer ID and Device ID
 * @param  handle: Flash handle pointer
 * @param  mfr_id: Output Manufacturer ID
 * @param  dev_id: Output Device ID
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadID(MD25Q64_Handle *handle, uint8_t *mfr_id, uint8_t *dev_id);

/**
 * @brief  Read Device ID
 * @param  handle: Flash handle pointer
 * @param  dev_id: Output Device ID
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadDeviceID(MD25Q64_Handle *handle, uint8_t *dev_id);

/* ============================================================================
 * Function Prototypes - Status Register
 * ============================================================================ */

/**
 * @brief  Read Status Register 1
 * @param  handle: Flash handle pointer
 * @param  status: Output status value
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadStatusReg1(MD25Q64_Handle *handle, uint8_t *status);

/**
 * @brief  Read Status Register 2
 * @param  handle: Flash handle pointer
 * @param  status: Output status value
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadStatusReg2(MD25Q64_Handle *handle, uint8_t *status);

/**
 * @brief  Read Status Register 3
 * @param  handle: Flash handle pointer
 * @param  status: Output status value
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReadStatusReg3(MD25Q64_Handle *handle, uint8_t *status);

/**
 * @brief  Write Status Register 1
 * @param  handle: Flash handle pointer
 * @param  status: Status value to write
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WriteStatusReg1(MD25Q64_Handle *handle, uint8_t status);

/**
 * @brief  Write Status Register 2
 * @param  handle: Flash handle pointer
 * @param  status: Status value to write
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WriteStatusReg2(MD25Q64_Handle *handle, uint8_t status);

/**
 * @brief  Write Status Register 3
 * @param  handle: Flash handle pointer
 * @param  status: Status value to write
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WriteStatusReg3(MD25Q64_Handle *handle, uint8_t status);

/**
 * @brief  Check if flash is busy
 * @param  handle: Flash handle pointer
 * @retval 1: Busy, 0: Not busy
 */
uint8_t MD25Q64_IsBusy(MD25Q64_Handle *handle);

/**
 * @brief  Wait for flash ready
 * @param  handle: Flash handle pointer
 * @param  timeout_ms: Timeout in milliseconds
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WaitForReady(MD25Q64_Handle *handle, uint32_t timeout_ms);

/* ============================================================================
 * Function Prototypes - Write Enable/Disable
 * ============================================================================ */

/**
 * @brief  Enable write operations
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WriteEnable(MD25Q64_Handle *handle);

/**
 * @brief  Disable write operations
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_WriteDisable(MD25Q64_Handle *handle);

/* ============================================================================
 * Function Prototypes - Read Operations
 * ============================================================================ */

/**
 * @brief  Read data from flash (Standard Read, up to 80MHz)
 * @param  handle: Flash handle pointer
 * @param  address: Start address (0x000000 - 0x7FFFFF)
 * @param  data: Output data buffer
 * @param  size: Number of bytes to read
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_Read(MD25Q64_Handle *handle, uint32_t address,
                             uint8_t *data, uint32_t size);

/**
 * @brief  Fast Read data from flash (up to 120MHz)
 * @param  handle: Flash handle pointer
 * @param  address: Start address
 * @param  data: Output data buffer
 * @param  size: Number of bytes to read
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_FastRead(MD25Q64_Handle *handle, uint32_t address,
                                 uint8_t *data, uint32_t size);

/* ============================================================================
 * Function Prototypes - Program Operations
 * ============================================================================ */

/**
 * @brief  Program a page (up to 256 bytes)
 * @param  handle: Flash handle pointer
 * @param  address: Start address (must be page aligned for full page write)
 * @param  data: Data buffer to write
 * @param  size: Number of bytes to write (1-256)
 * @retval MD25Q64_Status
 * @note   Target memory must be erased before programming
 */
MD25Q64_Status MD25Q64_PageProgram(MD25Q64_Handle *handle, uint32_t address,
                                    const uint8_t *data, uint32_t size);

/**
 * @brief  Write data to flash (automatic page handling)
 * @param  handle: Flash handle pointer
 * @param  address: Start address
 * @param  data: Data buffer to write
 * @param  size: Number of bytes to write
 * @retval MD25Q64_Status
 * @note   Target memory must be erased before writing
 */
MD25Q64_Status MD25Q64_Write(MD25Q64_Handle *handle, uint32_t address,
                              const uint8_t *data, uint32_t size);

/* ============================================================================
 * Function Prototypes - Erase Operations
 * ============================================================================ */

/**
 * @brief  Erase a sector (4KB)
 * @param  handle: Flash handle pointer
 * @param  address: Any address within the sector
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_EraseSector(MD25Q64_Handle *handle, uint32_t address);

/**
 * @brief  Erase a 32KB block
 * @param  handle: Flash handle pointer
 * @param  address: Any address within the block
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_EraseBlock32K(MD25Q64_Handle *handle, uint32_t address);

/**
 * @brief  Erase a 64KB block
 * @param  handle: Flash handle pointer
 * @param  address: Any address within the block
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_EraseBlock64K(MD25Q64_Handle *handle, uint32_t address);

/**
 * @brief  Erase entire chip
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 * @note   This operation takes a long time (up to 120 seconds)
 */
MD25Q64_Status MD25Q64_EraseChip(MD25Q64_Handle *handle);

/* ============================================================================
 * Function Prototypes - Power Management
 * ============================================================================ */

/**
 * @brief  Enter deep power-down mode
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_PowerDown(MD25Q64_Handle *handle);

/**
 * @brief  Release from deep power-down mode
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_ReleasePowerDown(MD25Q64_Handle *handle);

/* ============================================================================
 * Function Prototypes - Reset
 * ============================================================================ */

/**
 * @brief  Software reset the flash
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_Reset(MD25Q64_Handle *handle);

/* ============================================================================
 * Function Prototypes - Protection
 * ============================================================================ */

/**
 * @brief  Unlock all blocks (remove write protection)
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_UnlockAll(MD25Q64_Handle *handle);

/**
 * @brief  Lock all blocks (enable write protection)
 * @param  handle: Flash handle pointer
 * @retval MD25Q64_Status
 */
MD25Q64_Status MD25Q64_LockAll(MD25Q64_Handle *handle);

#ifdef __cplusplus
}
#endif

#endif /* __MD25Q64_H__ */
