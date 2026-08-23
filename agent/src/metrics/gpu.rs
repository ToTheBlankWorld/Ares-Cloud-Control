use crate::error::Result;
use crate::models::*;

#[cfg(target_os = "linux")]
use nvml_wrapper::{enum_wrappers::device::TemperatureSensor, NVML};

pub struct GpuCollector {
    #[cfg(target_os = "linux")]
    nvml: Option<NVML>,
    available: bool,
}

impl GpuCollector {
    pub fn new() -> Self {
        #[cfg(target_os = "linux")]
        let nvml = NVML::init().ok();
        #[cfg(not(target_os = "linux"))]
        let nvml: Option<()> = None;

        let available = nvml.is_some();
        if available {
            tracing::info!("NVIDIA GPU detected via NVML");
        } else {
            tracing::warn!("NVIDIA NVML unavailable");
        }

        Self { nvml, available }
    }

    pub fn disabled() -> Self {
        Self {
            #[cfg(target_os = "linux")]
            nvml: None,
            available: false,
        }
    }

    pub fn collect(&self) -> Result<GpuMetrics> {
        if !self.available {
            return Ok(GpuMetrics {
                available: false,
                devices: None,
            });
        }

        #[cfg(target_os = "linux")]
        {
            let nvml = self.nvml.as_ref().unwrap();
            let device_count = nvml.device_count()?;
            let mut devices = Vec::with_capacity(device_count as usize);

            for i in 0..device_count {
                let device = nvml.device_by_index(i)?;
                let name = device.name().unwrap_or_else(|_| "Unknown GPU".to_string());

                let utilization = device.utilization_rates().ok();
                let memory_info = device.memory_info().ok();
                let temperature = device.temperature(TemperatureSensor::Gpu).ok();
                let power_usage = device.power_usage().ok();
                let power_limit = device.power_management_limit().ok();
                let gpu_clock = device
                    .clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics)
                    .ok();
                let mem_clock = device
                    .clock_info(nvml_wrapper::enum_wrappers::device::Clock::Memory)
                    .ok();
                let fan_speed = device.fan_speed(0).ok();

                let mem = memory_info.as_ref();

                devices.push(GpuDeviceMetrics {
                    index: i,
                    name,
                    utilization_percent: utilization.map(|u| u.gpu as f32).unwrap_or(0.0),
                    memory_total_bytes: mem.map(|m| m.total).unwrap_or(0),
                    memory_used_bytes: mem.map(|m| m.used).unwrap_or(0),
                    memory_free_bytes: mem.map(|m| m.free).unwrap_or(0),
                    temperature_celsius: temperature.map(|t| t as f32),
                    power_usage_watts: power_usage.map(|p| p as f32 / 1000.0),
                    power_limit_watts: power_limit.map(|p| p as f32 / 1000.0),
                    gpu_clock_mhz: gpu_clock,
                    memory_clock_mhz: mem_clock,
                    fan_speed_percent: fan_speed.map(|f| f as f32),
                });
            }

            Ok(GpuMetrics {
                available: true,
                devices: Some(devices),
            })
        }

        #[cfg(not(target_os = "linux"))]
        {
            Ok(GpuMetrics {
                available: false,
                devices: None,
            })
        }
    }
}

impl Default for GpuCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gpu_collector_creation() {
        let collector = GpuCollector::new();
        assert!(!collector.available || collector.available);
    }

    #[test]
    fn test_gpu_collection() {
        let collector = GpuCollector::new();
        let metrics = collector.collect().unwrap();
        if !metrics.available {
            assert!(metrics.devices.is_none());
        } else {
            assert!(metrics.devices.is_some());
            let devices = metrics.devices.unwrap();
            for dev in devices {
                assert!(!dev.name.is_empty());
                assert!(dev.utilization_percent >= 0.0);
                assert!(dev.utilization_percent <= 100.0);
            }
        }
    }
}
