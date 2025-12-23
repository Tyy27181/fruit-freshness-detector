/**
 * @file    md25q64.c
 * @brief   MD25Q64C NOR Flash Driver Implementation
 * @details 64Mbit (8MB) SPI NOR Flash Driver
 *          Manufacturer: GigaDevice
 *          Support Standard SPI Mode
 */

#include "md25q64.h"

/* ============================================================================
 * Private Macros
 * ============================================================================ */
#define MD25Q64_CS_LOW(h)   HAL_GPIO_WritePin((h)->cs_port, (h)->cs_pin, GPIO_PIN_RESET)
#define MD25Q64_CS_HIGH(h)  HAL_GPIO_WritePin((h)->cs_port, (h)->cs_pin, GPIO_PIN_SET)

#define MD25Q64_SPI_TIMEOUT     1000

/* ============================================================================
 * Private Function Prototypes
 * ============================================================================ */
static MD25Q64_Status MD25Q64_SendCommand(MD25Q64_Handle *handle, uint8_t cmd);
static MD25Q64_Status MD25Q64_SendCommandWithAddress(MD25Q64_Handle *handle,
                                                      uint8_t cmd, uint32_t address);
static MD25Q64_Status MD25Q64_Transmit(MD25Q64_Handle *handle,
                                        const uint8_t *data, uint32_t size);
static MD25Q64_Status MD25Q64_Receive(MD25Q64_Handle *handle,
                                       uint8_t *data, uint32_t size);

/* ============================================================================
 * Initialization
 * ============================================================================ */

MD25Q64_Status MD25Q64_Init(MD25Q64_Handle *handle, SPI_HandleTypeDef *hspi,
                             GPIO_TypeDef *cs_port, uint16_t cs_pin)
{
    if (handle == NULL || hspi == NULL || cs_port == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    handle->hspi = hspi;
    handle->cs_port = cs_port;
    handle->cs_pin = cs_pin;

    /* Set CS high (deselect) */
    MD25Q64_CS_HIGH(handle);

    /* Wait for power-up (tVSL = 5ms max) */
    HAL_Delay(10);

    /* Verify device ID */
    uint32_t jedec_id;
    if (MD25Q64_ReadJEDECID(handle, &jedec_id) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    /* Check if JEDEC ID matches MD25Q64 */
    if ((jedec_id & 0xFFFF00) != 0xC84000) {
        /* Not a GigaDevice MD25Qxx device */
        return MD25Q64_ERROR;
    }

    return MD25Q64_OK;
}

/* ============================================================================
 * ID Read Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_ReadJEDECID(MD25Q64_Handle *handle, uint32_t *jedec_id)
{
    if (handle == NULL || jedec_id == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_READ_JEDEC_ID;
    uint8_t id[3];

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, id, 3) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    *jedec_id = ((uint32_t)id[0] << 16) | ((uint32_t)id[1] << 8) | id[2];
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_ReadID(MD25Q64_Handle *handle, uint8_t *mfr_id, uint8_t *dev_id)
{
    if (handle == NULL || mfr_id == NULL || dev_id == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd[4] = {MD25Q64_CMD_READ_MFR_DEVICE_ID, 0x00, 0x00, 0x00};
    uint8_t id[2];

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, id, 2) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    *mfr_id = id[0];
    *dev_id = id[1];
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_ReadDeviceID(MD25Q64_Handle *handle, uint8_t *dev_id)
{
    if (handle == NULL || dev_id == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd[4] = {MD25Q64_CMD_READ_DEVICE_ID, 0x00, 0x00, 0x00};
    uint8_t id;

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, &id, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    *dev_id = id;
    return MD25Q64_OK;
}

/* ============================================================================
 * Status Register Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_ReadStatusReg1(MD25Q64_Handle *handle, uint8_t *status)
{
    if (handle == NULL || status == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_READ_STATUS_REG1;

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, status, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_ReadStatusReg2(MD25Q64_Handle *handle, uint8_t *status)
{
    if (handle == NULL || status == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_READ_STATUS_REG2;

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, status, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_ReadStatusReg3(MD25Q64_Handle *handle, uint8_t *status)
{
    if (handle == NULL || status == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_READ_STATUS_REG3;

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, status, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_WriteStatusReg1(MD25Q64_Handle *handle, uint8_t status)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Write Enable first */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    uint8_t cmd[2] = {MD25Q64_CMD_WRITE_STATUS_REG1, status};

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 2) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for write complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_WRITE_SR);
}

MD25Q64_Status MD25Q64_WriteStatusReg2(MD25Q64_Handle *handle, uint8_t status)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Write Enable first */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    uint8_t cmd[2] = {MD25Q64_CMD_WRITE_STATUS_REG2, status};

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 2) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for write complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_WRITE_SR);
}

MD25Q64_Status MD25Q64_WriteStatusReg3(MD25Q64_Handle *handle, uint8_t status)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Write Enable first */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    uint8_t cmd[2] = {MD25Q64_CMD_WRITE_STATUS_REG3, status};

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 2) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for write complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_WRITE_SR);
}

uint8_t MD25Q64_IsBusy(MD25Q64_Handle *handle)
{
    uint8_t status;
    if (MD25Q64_ReadStatusReg1(handle, &status) != MD25Q64_OK) {
        return 1; /* Assume busy on error */
    }
    return (status & MD25Q64_SR1_WIP) ? 1 : 0;
}

MD25Q64_Status MD25Q64_WaitForReady(MD25Q64_Handle *handle, uint32_t timeout_ms)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint32_t start = HAL_GetTick();
    uint8_t status;

    while ((HAL_GetTick() - start) < timeout_ms) {
        if (MD25Q64_ReadStatusReg1(handle, &status) != MD25Q64_OK) {
            return MD25Q64_ERROR;
        }
        if ((status & MD25Q64_SR1_WIP) == 0) {
            return MD25Q64_OK;
        }
        /* Small delay to reduce SPI bus traffic */
        HAL_Delay(1);
    }

    return MD25Q64_TIMEOUT;
}

/* ============================================================================
 * Write Enable/Disable Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_WriteEnable(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_WRITE_ENABLE;

    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, &cmd, 1);
    MD25Q64_CS_HIGH(handle);

    return status;
}

MD25Q64_Status MD25Q64_WriteDisable(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_WRITE_DISABLE;

    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, &cmd, 1);
    MD25Q64_CS_HIGH(handle);

    return status;
}

/* ============================================================================
 * Read Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_Read(MD25Q64_Handle *handle, uint32_t address,
                             uint8_t *data, uint32_t size)
{
    if (handle == NULL || data == NULL || size == 0) {
        return MD25Q64_INVALID_PARAM;
    }

    if ((address + size) > MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Command + 24-bit address */
    uint8_t cmd[4] = {
        MD25Q64_CMD_READ_DATA,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, data, size) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);
    return MD25Q64_OK;
}

MD25Q64_Status MD25Q64_FastRead(MD25Q64_Handle *handle, uint32_t address,
                                 uint8_t *data, uint32_t size)
{
    if (handle == NULL || data == NULL || size == 0) {
        return MD25Q64_INVALID_PARAM;
    }

    if ((address + size) > MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Command + 24-bit address + 1 dummy byte */
    uint8_t cmd[5] = {
        MD25Q64_CMD_FAST_READ,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address),
        0x00  /* Dummy byte */
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 5) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Receive(handle, data, size) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);
    return MD25Q64_OK;
}

/* ============================================================================
 * Program Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_PageProgram(MD25Q64_Handle *handle, uint32_t address,
                                    const uint8_t *data, uint32_t size)
{
    if (handle == NULL || data == NULL || size == 0) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Maximum 256 bytes per page */
    if (size > MD25Q64_PAGE_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    if ((address + size) > MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Wait for any previous operation to complete */
    if (MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_DEFAULT) != MD25Q64_OK) {
        return MD25Q64_TIMEOUT;
    }

    /* Write Enable */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    /* Command + 24-bit address */
    uint8_t cmd[4] = {
        MD25Q64_CMD_PAGE_PROGRAM,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    if (MD25Q64_Transmit(handle, data, size) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for programming to complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_PAGE_PROGRAM);
}

MD25Q64_Status MD25Q64_Write(MD25Q64_Handle *handle, uint32_t address,
                              const uint8_t *data, uint32_t size)
{
    if (handle == NULL || data == NULL || size == 0) {
        return MD25Q64_INVALID_PARAM;
    }

    if ((address + size) > MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    uint32_t bytes_written = 0;
    uint32_t current_addr = address;
    const uint8_t *current_data = data;

    while (bytes_written < size) {
        /* Calculate bytes remaining in current page */
        uint32_t page_offset = current_addr % MD25Q64_PAGE_SIZE;
        uint32_t bytes_in_page = MD25Q64_PAGE_SIZE - page_offset;
        uint32_t bytes_to_write = size - bytes_written;

        if (bytes_to_write > bytes_in_page) {
            bytes_to_write = bytes_in_page;
        }

        /* Program current chunk */
        MD25Q64_Status status = MD25Q64_PageProgram(handle, current_addr,
                                                     current_data, bytes_to_write);
        if (status != MD25Q64_OK) {
            return status;
        }

        bytes_written += bytes_to_write;
        current_addr += bytes_to_write;
        current_data += bytes_to_write;
    }

    return MD25Q64_OK;
}

/* ============================================================================
 * Erase Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_EraseSector(MD25Q64_Handle *handle, uint32_t address)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    if (address >= MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Wait for any previous operation to complete */
    if (MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_DEFAULT) != MD25Q64_OK) {
        return MD25Q64_TIMEOUT;
    }

    /* Write Enable */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    /* Command + 24-bit address */
    uint8_t cmd[4] = {
        MD25Q64_CMD_SECTOR_ERASE,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for erase to complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_SECTOR_ERASE);
}

MD25Q64_Status MD25Q64_EraseBlock32K(MD25Q64_Handle *handle, uint32_t address)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    if (address >= MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Wait for any previous operation to complete */
    if (MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_DEFAULT) != MD25Q64_OK) {
        return MD25Q64_TIMEOUT;
    }

    /* Write Enable */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    /* Command + 24-bit address */
    uint8_t cmd[4] = {
        MD25Q64_CMD_BLOCK_ERASE_32K,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for erase to complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_BLOCK_ERASE_32K);
}

MD25Q64_Status MD25Q64_EraseBlock64K(MD25Q64_Handle *handle, uint32_t address)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    if (address >= MD25Q64_FLASH_SIZE) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Wait for any previous operation to complete */
    if (MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_DEFAULT) != MD25Q64_OK) {
        return MD25Q64_TIMEOUT;
    }

    /* Write Enable */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    /* Command + 24-bit address */
    uint8_t cmd[4] = {
        MD25Q64_CMD_BLOCK_ERASE_64K,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, cmd, 4) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for erase to complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_BLOCK_ERASE_64K);
}

MD25Q64_Status MD25Q64_EraseChip(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Wait for any previous operation to complete */
    if (MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_DEFAULT) != MD25Q64_OK) {
        return MD25Q64_TIMEOUT;
    }

    /* Write Enable */
    if (MD25Q64_WriteEnable(handle) != MD25Q64_OK) {
        return MD25Q64_ERROR;
    }

    uint8_t cmd = MD25Q64_CMD_CHIP_ERASE;

    MD25Q64_CS_LOW(handle);

    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }

    MD25Q64_CS_HIGH(handle);

    /* Wait for erase to complete */
    return MD25Q64_WaitForReady(handle, MD25Q64_TIMEOUT_CHIP_ERASE);
}

/* ============================================================================
 * Power Management Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_PowerDown(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_DEEP_POWER_DOWN;

    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, &cmd, 1);
    MD25Q64_CS_HIGH(handle);

    /* Wait tDP (20us) for entering deep power-down mode */
    HAL_Delay(1);

    return status;
}

MD25Q64_Status MD25Q64_ReleasePowerDown(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    uint8_t cmd = MD25Q64_CMD_RELEASE_POWER_DOWN;

    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, &cmd, 1);
    MD25Q64_CS_HIGH(handle);

    /* Wait tRES1 (20us) for releasing from deep power-down mode */
    HAL_Delay(1);

    return status;
}

/* ============================================================================
 * Reset Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_Reset(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Send Enable Reset command */
    uint8_t cmd = MD25Q64_CMD_ENABLE_RESET;

    MD25Q64_CS_LOW(handle);
    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }
    MD25Q64_CS_HIGH(handle);

    /* Send Reset command */
    cmd = MD25Q64_CMD_RESET;

    MD25Q64_CS_LOW(handle);
    if (MD25Q64_Transmit(handle, &cmd, 1) != MD25Q64_OK) {
        MD25Q64_CS_HIGH(handle);
        return MD25Q64_ERROR;
    }
    MD25Q64_CS_HIGH(handle);

    /* Wait tRST (30us) for reset complete */
    HAL_Delay(1);

    return MD25Q64_OK;
}

/* ============================================================================
 * Protection Operations
 * ============================================================================ */

MD25Q64_Status MD25Q64_UnlockAll(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Clear all BP bits in Status Register 1 */
    return MD25Q64_WriteStatusReg1(handle, 0x00);
}

MD25Q64_Status MD25Q64_LockAll(MD25Q64_Handle *handle)
{
    if (handle == NULL) {
        return MD25Q64_INVALID_PARAM;
    }

    /* Set all BP bits to protect entire chip */
    /* BP4=0, BP3=0, BP2=1, BP1=1, BP0=1 -> All protected (CMP=0) */
    return MD25Q64_WriteStatusReg1(handle, 0x1C);
}

/* ============================================================================
 * Private Functions
 * ============================================================================ */

static MD25Q64_Status MD25Q64_SendCommand(MD25Q64_Handle *handle, uint8_t cmd)
{
    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, &cmd, 1);
    MD25Q64_CS_HIGH(handle);
    return status;
}

static MD25Q64_Status MD25Q64_SendCommandWithAddress(MD25Q64_Handle *handle,
                                                      uint8_t cmd, uint32_t address)
{
    uint8_t data[4] = {
        cmd,
        (uint8_t)(address >> 16),
        (uint8_t)(address >> 8),
        (uint8_t)(address)
    };

    MD25Q64_CS_LOW(handle);
    MD25Q64_Status status = MD25Q64_Transmit(handle, data, 4);
    MD25Q64_CS_HIGH(handle);
    return status;
}

static MD25Q64_Status MD25Q64_Transmit(MD25Q64_Handle *handle,
                                        const uint8_t *data, uint32_t size)
{
    HAL_StatusTypeDef hal_status;
    hal_status = HAL_SPI_Transmit(handle->hspi, (uint8_t *)data, size, MD25Q64_SPI_TIMEOUT);
    return (hal_status == HAL_OK) ? MD25Q64_OK : MD25Q64_ERROR;
}

static MD25Q64_Status MD25Q64_Receive(MD25Q64_Handle *handle,
                                       uint8_t *data, uint32_t size)
{
    HAL_StatusTypeDef hal_status;
    hal_status = HAL_SPI_Receive(handle->hspi, data, size, MD25Q64_SPI_TIMEOUT);
    return (hal_status == HAL_OK) ? MD25Q64_OK : MD25Q64_ERROR;
}
