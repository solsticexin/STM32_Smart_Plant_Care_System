//! 土壤湿度传感器（模拟量）读取与转换工具

use nb::block;
use stm32f1xx_hal::{
    adc::{Adc, SampleTime},
    gpio::{gpioa::PA0, Analog},
    pac::ADC1,
    prelude::_embedded_hal_adc_OneShot,
};

/// 干燥（空气）环境下测得的 ADC 原始值
pub const RAW_DRY_AIR: u16 = 4002;
/// 饱和（清水）环境下测得的 ADC 原始值
pub const RAW_WET_WATER: u16 = 1312;

/// 简单的模拟量土壤湿度读取器
pub struct SoilSensor;

impl SoilSensor {
    /// 采集一次 ADC 原始值，已经设置了较长采样时间以提升稳定性
    pub fn read_raw(adc: &mut Adc<ADC1>, pin: &mut PA0<Analog>) -> u16 {
        adc.set_sample_time(SampleTime::T_239);
        block!(adc.read(pin)).unwrap_or(0u16)
    }

    /// 将原始 ADC 数值映射为 0-100% 的相对湿度
    #[inline]
    pub fn raw_to_percent(raw: u16) -> u8 {
        let range = RAW_DRY_AIR.saturating_sub(RAW_WET_WATER) as u32;
        if range == 0 {
            return 0;
        }

        if raw >= RAW_DRY_AIR {
            0
        } else if raw <= RAW_WET_WATER {
            100
        } else {
            let relative = (RAW_DRY_AIR - raw) as u32;
            ((relative * 100) / range).min(100) as u8
        }
    }

    /// 采集一次 ADC，并将原始值转换为 0-100% 的百分比
    #[allow(dead_code)]
    pub fn read_percent(adc: &mut Adc<ADC1>, pin: &mut PA0<Analog>) -> u8 {
        let raw = Self::read_raw(adc, pin);
        Self::raw_to_percent(raw)
    }
}
