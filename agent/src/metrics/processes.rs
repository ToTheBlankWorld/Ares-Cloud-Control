use crate::error::Result;
use crate::models::*;
use std::collections::HashMap;
use sysinfo::{Pid, Process, ProcessRefreshKind, ProcessStatus, System, SystemExt};

pub struct ProcessCollector {
    system: System,
    prev_cpu_times: HashMap<Pid, f32>,
    limit: usize,
    first_run: bool,
}

impl ProcessCollector {
    pub fn new(limit: usize) -> Self {
        let mut system = System::new_all();
        system.refresh_processes(ProcessRefreshKind::everything());
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
        self.system
            .refresh_processes(ProcessRefreshKind::everything().with_cpu());

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
                    name: proc_.name().to_string_lossy().to_string(),
                    command: proc_.cmd().join(" "),
                    user: proc_
                        .user_id()
                        .map(|u| u.to_string())
                        .unwrap_or_else(|| "unknown".to_string()),
                    cpu_percent: smoothed_cpu,
                    memory_bytes: proc_.memory(),
                    thread_count: proc_.thread_count().unwrap_or(0),
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

    pub fn collect_sorted(
        &mut self,
        sort_by: ProcessSortBy,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<ProcessMetrics>> {
        self.system
            .refresh_processes(ProcessRefreshKind::everything().with_cpu());

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
                    name: proc_.name().to_string_lossy().to_string(),
                    command: proc_.cmd().join(" "),
                    user: proc_
                        .user_id()
                        .map(|u| u.to_string())
                        .unwrap_or_else(|| "unknown".to_string()),
                    cpu_percent: smoothed_cpu,
                    memory_bytes: proc_.memory(),
                    thread_count: proc_.thread_count().unwrap_or(0),
                    state,
                    start_time: start_time / 1_000_000,
                    run_time,
                }
            })
            .collect();

        self.prev_cpu_times = Self::read_cpu_usage(&self.system);
        self.first_run = false;

        match sort_by {
            ProcessSortBy::Cpu => processes.sort_by(|a, b| {
                b.cpu_percent
                    .partial_cmp(&a.cpu_percent)
                    .unwrap_or(std::cmp::Ordering::Equal)
            }),
            ProcessSortBy::Memory => processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes)),
            ProcessSortBy::Pid => processes.sort_by(|a, b| a.pid.cmp(&b.pid)),
            ProcessSortBy::Name => processes.sort_by(|a, b| a.name.cmp(&b.name)),
        }

        let start = offset.min(processes.len());
        let end = (start + limit).min(processes.len());
        Ok(processes[start..end].to_vec())
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
    use crate::models::ProcessSortBy;

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
            assert!(proc.memory_bytes >= 0);
        }
    }

    #[test]
    fn test_process_sorted_collection() {
        let mut collector = ProcessCollector::new(100);
        let processes = collector
            .collect_sorted(ProcessSortBy::Memory, 10, 0)
            .unwrap();
        assert!(processes.len() <= 10);
        for i in 1..processes.len() {
            assert!(processes[i - 1].memory_bytes >= processes[i].memory_bytes);
        }
    }
}
