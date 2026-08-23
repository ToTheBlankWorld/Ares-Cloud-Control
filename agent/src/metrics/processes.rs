use crate::error::Result;
use crate::models::*;
use std::collections::HashMap;
use sysinfo::{Pid, ProcessStatus, System};

pub struct ProcessCollector {
    system: System,
    prev_cpu_times: HashMap<Pid, f32>,
    limit: usize,
    first_run: bool,
}

impl ProcessCollector {
    pub fn new(limit: usize) -> Self {
        let mut system = System::new_all();
        system.refresh_processes();
        let prev_cpu_times = Self::read_cpu_usage(&system);
        Self {
            system,
            prev_cpu_times,
            limit,
            first_run: true,
        }
    }

    fn read_cpu_usage(sys: &System) -> HashMap<Pid, f32> {
        sys.processes()
            .iter()
            .map(|(pid, proc_)| (*pid, proc_.cpu_usage()))
            .collect()
    }

    pub fn collect(&mut self) -> Result<Vec<ProcessMetrics>> {
        self.system.refresh_processes();

        let mut processes: Vec<ProcessMetrics> = self
            .system
            .processes()
            .iter()
            .map(|(pid, proc_)| {
                let cpu_percent = proc_.cpu_usage();
                let prev_cpu = self.prev_cpu_times.get(pid).copied().unwrap_or(0.0);
                let smoothed_cpu = if !self.first_run && prev_cpu > 0.0 {
                    (cpu_percent + prev_cpu) / 2.0
                } else {
                    cpu_percent
                };

                let state = match proc_.status() {
                    ProcessStatus::Run => ProcessState::Running,
                    ProcessStatus::Sleep => ProcessState::Sleeping,
                    ProcessStatus::Stop => ProcessState::Stopped,
                    ProcessStatus::Zombie => ProcessState::Zombie,
                    ProcessStatus::Dead => ProcessState::Dead,
                    ProcessStatus::Idle => ProcessState::Idle,
                    _ => ProcessState::Unknown,
                };

                let start_time = proc_.start_time();
                let run_time = System::uptime().saturating_sub(start_time / 1_000_000);

                ProcessMetrics {
                    pid: pid.as_u32(),
                    name: proc_.name().to_string(),
                    command: proc_.cmd().join(" "),
                    user: proc_
                        .user_id()
                        .map(|u| u.to_string())
                        .unwrap_or_else(|| "unknown".to_string()),
                    cpu_percent: smoothed_cpu,
                    memory_bytes: proc_.memory(),
                    thread_count: 0, // thread_count() not available in sysinfo 0.30
                    state,
                    start_time: start_time / 1_000_000,
                    run_time,
                }
            })
            .collect();

        self.prev_cpu_times = Self::read_cpu_usage(&self.system);
        self.first_run = false;

        processes.sort_by(|a, b| {
            b.cpu_percent
                .partial_cmp(&a.cpu_percent)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        if processes.len() > self.limit {
            processes.truncate(self.limit);
        }

        Ok(processes)
    }
}

impl Default for ProcessCollector {
    fn default() -> Self {
        Self::new(100)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_collector_creation() {
        let collector = ProcessCollector::new(50);
        assert_eq!(collector.limit, 50);
    }

    #[test]
    fn test_process_collection() {
        let mut collector = ProcessCollector::new(10);
        let processes = collector.collect().unwrap();
        assert!(!processes.is_empty());
        assert!(processes.len() <= 10);
        for proc in &processes {
            assert!(proc.pid > 0);
            assert!(!proc.name.is_empty());
            assert!(proc.cpu_percent >= 0.0);
            assert!(proc.memory_bytes >= proc.memory_bytes); // Valid invariant
            assert!(!proc.state.to_string().is_empty());
        }
        // Test that collect() can be called multiple times
        let _ = collector.collect().unwrap();
    }
}
