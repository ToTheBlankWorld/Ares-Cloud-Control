use crate::error::Result;
use crate::models::*;
use sysinfo::{System, SystemExt};

pub struct MemoryCollector {
    system: System,
}

impl MemoryCollector {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_memory();
        Self { system }
    }

    pub fn collect(&mut self) -> Result<(MemoryMetrics, SwapMetrics)> {
        self.system.refresh_memory();

        let memory = MemoryMetrics {
            total_bytes: self.system.total_memory(),
            used_bytes: self.system.used_memory(),
            available_bytes: self.system.available_memory(),
            free_bytes: self.system.free_memory(),
            cached_bytes: self.system.total_memory()
                - self.system.used_memory()
                - self.system.free_memory(),
        };

        let swap = SwapMetrics {
            total_bytes: self.system.total_swap(),
            used_bytes: self.system.used_swap(),
            free_bytes: self.system.free_swap(),
        };

        Ok((memory, swap))
    }
}

impl Default for MemoryCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_collector_creation() {
        let collector = MemoryCollector::new();
        assert!(collector.system.total_memory() > 0);
    }

    #[test]
    fn test_memory_collection() {
        let mut collector = MemoryCollector::new();
        let (memory, swap) = collector.collect().unwrap();
        assert!(memory.total_bytes > 0);
        assert!(memory.used_bytes <= memory.total_bytes);
        assert!(memory.available_bytes <= memory.total_bytes);
        assert!(swap.total_bytes >= swap.used_bytes);
    }
}
