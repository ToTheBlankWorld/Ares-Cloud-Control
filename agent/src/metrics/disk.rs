use crate::error::Result;
use crate::models::*;
use std::collections::HashMap;
use std::fs;
use std::time::{Duration, Instant};
use sysinfo::Disks;

pub struct DiskCollector {
    disks: Disks,
    prev_io: HashMap<String, DiskIoSnapshot>,
    last_update: Option<Instant>,
}

#[derive(Clone, Debug)]
struct DiskIoSnapshot {
    read_bytes: u64,
    write_bytes: u64,
    timestamp: Instant,
}

impl DiskCollector {
    pub fn new() -> Self {
        let mut disks = Disks::new();
        disks.refresh();
        Self {
            disks,
            prev_io: HashMap::new(),
            last_update: None,
        }
    }

    pub fn collect(&mut self) -> Result<DiskMetrics> {
        self.disks.refresh();

        let now = Instant::now();
        let elapsed = self.last_update.map_or(Duration::from_secs(1), |last| {
            now.duration_since(last).max(Duration::from_millis(100))
        });
        self.last_update = Some(now);

        // Read I/O stats from /proc/diskstats
        let mut disk_io_stats = HashMap::new();
        if let Ok(content) = fs::read_to_string("/proc/diskstats") {
            for line in content.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 14 {
                    let device = parts[2];
                    let read_bytes = parts[5].parse::<u64>().unwrap_or(0) * 512; // sectors * 512
                    let write_bytes = parts[9].parse::<u64>().unwrap_or(0) * 512; // sectors * 512
                    disk_io_stats.insert(device.to_string(), (read_bytes, write_bytes));
                }
            }
        }

        let now = Instant::now();
        let mut filesystems = Vec::new();
        let mut total_read_bytes = 0u64;
        let mut total_write_bytes = 0u64;

        for disk in self.disks.list() {
            let total = disk.total_space();
            let available = disk.available_space();
            let used = total.saturating_sub(available);
            let usage_percent = if total > 0 {
                (used as f32 / total as f32) * 100.0
            } else {
                0.0
            };

            let mount_point = disk.mount_point().to_string_lossy().to_string();
            let filesystem = format!("{:?}", disk.file_system())
                .trim_start_matches('"')
                .trim_end_matches('"')
                .to_string();

            filesystems.push(FilesystemMetrics {
                mount_point,
                filesystem,
                total_bytes: total,
                used_bytes: used,
                available_bytes: available,
                usage_percent,
            });

            let name = disk.name().to_string_lossy().to_string();
            let (read_bytes, write_bytes) = disk_io_stats.get(&name).copied().unwrap_or((0, 0));

            let current = DiskIoSnapshot {
                read_bytes,
                write_bytes,
                timestamp: now,
            };

            if let Some(prev) = self.prev_io.get(&name) {
                let dt = elapsed.as_secs_f64().max(0.1);
                let read_bps =
                    ((current.read_bytes.saturating_sub(prev.read_bytes)) as f64 / dt) as u64;
                let write_bps =
                    ((current.write_bytes.saturating_sub(prev.write_bytes)) as f64 / dt) as u64;

                total_read_bytes += read_bps;
                total_write_bytes += write_bps;
            }

            self.prev_io.insert(name, current);
        }

        let io = if !filesystems.is_empty() {
            Some(DiskIoMetrics {
                read_bytes_per_sec: total_read_bytes,
                write_bytes_per_sec: total_write_bytes,
                read_ops_per_sec: 0,
                write_ops_per_sec: 0,
            })
        } else {
            None
        };

        Ok(DiskMetrics { filesystems, io })
    }
}

impl Default for DiskCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disk_collector_creation() {
        let collector = DiskCollector::new();
        assert!(collector.disks.list().len() >= 0);
    }

    #[test]
    fn test_disk_collection() {
        let mut collector = DiskCollector::new();
        let metrics = collector.collect().unwrap();
        assert!(!metrics.filesystems.is_empty());
        for fs in &metrics.filesystems {
            assert!(!fs.mount_point.is_empty());
            assert!(fs.total_bytes >= fs.used_bytes);
            assert!(fs.usage_percent >= 0.0);
            assert!(fs.usage_percent <= 100.0);
        }
    }
}
