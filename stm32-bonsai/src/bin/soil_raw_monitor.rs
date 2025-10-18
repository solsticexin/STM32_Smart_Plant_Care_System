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

/// Minimal test entry that reports raw soil moisture ADC values via defmt `info!` logs.
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
    adc.set_sample_time(SampleTime::T_239);

    let mut delay = Delay::new(cp.SYST, rcc.clocks.sysclk().raw());
    info!("soil raw monitor ready");

    loop {
        let raw: u16 = block!(adc.read(&mut soil_pin)).unwrap_or(0);
        info!("{=u16}", raw);
        delay.delay_ms(1_000_u32);
    }
}
