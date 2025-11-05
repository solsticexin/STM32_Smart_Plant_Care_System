#![deny(unsafe_code)]
#![no_std]
#![no_main]

use cortex_m::delay::Delay;
use cortex_m_rt::entry;
use defmt::info;
use defmt_rtt as _;
use nb::block;
use panic_probe as _;
use stm32f1xx_hal::{
    adc::{Adc, SampleTime},
    pac,
    prelude::*,
    rcc::Config as RccConfig,
};

/// 最小化示例：通过 defmt `info!` 日志输出土壤湿度 ADC 原始值。
///
/// 用途：用于标定与观察土壤湿度传感器在不同介质下的原始 ADC 数值，
/// 例如空气（干燥）与清水（湿润）对应的读数范围，为映射百分比提供依据。
#[entry]
fn main() -> ! {
    let cp = cortex_m::Peripherals::take().unwrap();
    let dp = pac::Peripherals::take().unwrap();

    let mut flash = dp.FLASH.constrain();
    let mut rcc = dp
        .RCC
        .freeze(
            RccConfig::hse(8.MHz())
                .sysclk(72.MHz())
                .pclk1(36.MHz())
                .pclk2(72.MHz()),
            &mut flash.acr,
        );

    let mut gpioa = dp.GPIOA.split(&mut rcc);
    let mut soil_pin = gpioa.pa0.into_analog(&mut gpioa.crl);

    let mut adc = Adc::new(dp.ADC1, &mut rcc);
    // 选择较长采样时间以提升读取稳定性，减少抖动与噪声
    adc.set_sample_time(SampleTime::T_239);

    let mut delay = Delay::new(cp.SYST, rcc.clocks.sysclk().raw());
    info!("soil raw monitor ready");

    // 每 1 秒采集一次并打印原始值，可配合 `defmt-print` 或 RTT 观测
    loop {
        let raw: u16 = block!(adc.read(&mut soil_pin)).unwrap_or(0);
        info!("{=u16}", raw);
        delay.delay_ms(1_000_u32);
    }
}
