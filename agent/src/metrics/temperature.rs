use crate::error::Result;
use crate::models::*;
use std::collections::HashMap;
use sysinfo::{Component, ComponentExt, System, SystemExt};

pub struct TemperatureCollector {
    system: System,
}

impl TemperatureCollector {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_components();
        Self { system }
    }

    pub fn collect(&mut self) -> Result<TemperatureMetrics> {
        self.system.refresh_components();

        let mut cpu_package = None;
        let mut cpu_cores = Vec::new();
        let mut gpu = Vec::new();
        let mut other = HashMap::new();

        for component in self.system.components() {
            let label = component.label().to_lowercase();
            let temp = component.temperature();

            if label.contains("package") || label.contains("cpu package") || label == "core" {
                cpu_package = Some(temp);
            } else if label.starts_with("core") && label.len() > 4 {
                cpu_cores.push(Some(temp));
            } else if label.contains("gpu") || label.contains("nvidia") || label.contains("amd") {
                gpu.push(Some(temp));
            } else {
                other.insert(component.label().to_string(), temp);
            }
        }

        if cpu_cores.is_empty() {
            for component in self.system.components() {
                let label = component.label().to_lowercase();
                if label.starts_with("core") {
                    cpu_cores.push(Some(component.temperature()));
                }
            }
        }

        Ok(TemperatureMetrics {
            cpu_package,
            cpu_cores,
            gpu,
            other,
        })
    }
}

impl Default for TemperatureCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_temperature_collector_creation() {
        let collector = TemperatureCollector::new();
    }

    #[test]
    fn test_temperature_collection() {
        let mut collector = TemperatureCollector::new();
        let metrics = collector.collect().unwrap();
    }
}
