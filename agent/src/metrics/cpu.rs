use crate::error::Result;
use crate::models::*;
use std::time::Duration;
use sysinfo::{Cpu, CpuRefreshKind, System, SystemExt};

pub struct CpuCollector {
    system: System,
    first_run: bool,
}

impl CpuCollector {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_cpu(CpuRefreshKind::everything());
        Self {
            system,
            first_run: true,
        }
    }

    pub fn collect(&mut self) -> Result<CpuMetrics> {
        self.system.refresh_cpu(CpuRefreshKind::everything());

        let core_count = self.system.cpus().len();
        let thread_count = core_count;

        let mut cores = Vec::with_capacity(core_count);
        let mut total_usage = 0.0f32;
        let mut frequencies = Vec::with_capacity(core_count);

        for (i, cpu) in self.system.cpus().iter().enumerate() {
            let usage = cpu.cpu_usage();
            total_usage += usage;
            frequencies.push(cpu.frequency());
            cores.push(CpuCoreMetrics {
                id: i,
                usage_percent: usage,
                frequency_mhz: Some(cpu.frequency()),
                temperature_celsius: None,
            });
        }

        let load_average = LoadAverage {
            one: self.system.load_average().one as f64,
            five: self.system.load_average().five as f64,
            fifteen: self.system.load_average().fifteen as f64,
        };

        self.first_run = false;

        Ok(CpuMetrics {
            total_usage_percent: if core_count > 0 {
                total_usage / core_count as f32
            } else {
                0.0
            },
            cores,
            load_average,
            core_count,
            thread_count,
            frequencies_mhz: frequencies,
        })
    }
}

impl Default for CpuCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cpu_collector_creation() {
        let collector = CpuCollector::new();
        assert!(collector.system.cpus().len() > 0);
    }

    #[test]
    fn test_cpu_collection() {
        let mut collector = CpuCollector::new();
        let metrics = collector.collect().unwrap();
        assert!(metrics.core_count > 0);
        assert_eq!(metrics.cores.len(), metrics.core_count);
        assert!(metrics.total_usage_percent >= 0.0);
        assert!(metrics.total_usage_percent <= 100.0);
    }
}
