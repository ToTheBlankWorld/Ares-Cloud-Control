use crate::error::Result;
use crate::models::*;
use chrono::{DateTime, Utc};
use sysinfo::System;

pub struct SystemCollector {
    system: System,
    boot_time: u64,
}

impl SystemCollector {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        let boot_time = System::boot_time();
        Self { system, boot_time }
    }

    pub fn collect(&mut self) -> Result<SystemInfo> {
        self.system.refresh_all();

        let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
        let os_name = System::name().unwrap_or_else(|| "unknown".to_string());
        let os_version = System::os_version().unwrap_or_else(|| "unknown".to_string());
        let kernel_version = System::kernel_version().unwrap_or_else(|| "unknown".to_string());
        let architecture = System::cpu_arch().unwrap_or_else(|| "unknown".to_string());
        let uptime_seconds = System::uptime();

        let now = Utc::now();
        let boot_time = DateTime::from_timestamp(self.boot_time as i64, 0).unwrap_or(now);

        Ok(SystemInfo {
            hostname,
            os_name,
            os_version,
            kernel_version,
            architecture,
            uptime_seconds,
            boot_time,
            agent_version: env!("CARGO_PKG_VERSION").to_string(),
            server_timestamp: now,
        })
    }
}

impl Default for SystemCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_collector_creation() {
        let collector = SystemCollector::new();
        assert!(collector.boot_time > 0);
    }

    #[test]
    fn test_system_collection() {
        let mut collector = SystemCollector::new();
        let info = collector.collect().unwrap();
        assert!(!info.hostname.is_empty());
        assert!(!info.os_name.is_empty());
        assert!(!info.kernel_version.is_empty());
        assert!(info.uptime_seconds > 0);
        assert!(!info.agent_version.is_empty());
    }
}
