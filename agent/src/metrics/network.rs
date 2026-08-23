use crate::error::Result;
use crate::models::*;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use sysinfo::{NetworkExt, NetworksExt, System, SystemExt};

pub struct NetworkCollector {
    system: System,
    prev_stats: HashMap<String, NetworkSnapshot>,
    last_update: Option<Instant>,
    first_run: bool,
}

#[derive(Clone, Debug)]
struct NetworkSnapshot {
    received: u64,
    transmitted: u64,
    timestamp: Instant,
}

impl NetworkCollector {
    pub fn new() -> Self {
        let mut system = System::new();
        system.refresh_networks();
        let prev_stats = Self::read_network_stats(&system);
        Self {
            system,
            prev_stats,
            last_update: None,
            first_run: true,
        }
    }

    fn read_network_stats(sys: &System) -> HashMap<String, NetworkSnapshot> {
        let now = Instant::now();
        sys.networks()
            .iter()
            .map(|(name, data)| {
                (
                    name.clone(),
                    NetworkSnapshot {
                        received: data.total_received(),
                        transmitted: data.total_transmitted(),
                        timestamp: now,
                    },
                )
            })
            .collect()
    }

    pub fn collect(&mut self) -> Result<NetworkMetrics> {
        self.system.refresh_networks();

        let now = Instant::now();
        let elapsed = self.last_update.map_or(Duration::from_secs(1), |last| {
            now.duration_since(last).max(Duration::from_millis(100))
        });
        self.last_update = Some(now);

        let mut interfaces = Vec::new();

        for (name, data) in self.system.networks() {
            let ipv4_addresses = Vec::new();
            let ipv6_addresses = Vec::new();
            let received = data.total_received();
            let transmitted = data.total_transmitted();
            let is_up = true;
            let is_loopback = name == "lo" || name.starts_with("loop");

            let mut rx_per_sec = 0u64;
            let mut tx_per_sec = 0u64;

            if !self.first_run {
                if let Some(prev) = self.prev_stats.get(name) {
                    let dt = elapsed.as_secs_f64().max(0.1);
                    rx_per_sec = ((received.saturating_sub(prev.received)) as f64 / dt) as u64;
                    tx_per_sec =
                        ((transmitted.saturating_sub(prev.transmitted)) as f64 / dt) as u64;
                }
            } else {
                self.first_run = false;
            }

            self.prev_stats.insert(
                name.clone(),
                NetworkSnapshot {
                    received,
                    transmitted,
                    timestamp: now,
                },
            );

            interfaces.push(NetworkInterfaceMetrics {
                name: name.clone(),
                ipv4_addresses,
                ipv6_addresses,
                received_bytes: received,
                transmitted_bytes: transmitted,
                received_bytes_per_sec: rx_per_sec,
                transmitted_bytes_per_sec: tx_per_sec,
                is_up,
                is_loopback,
            });
        }

        Ok(NetworkMetrics { interfaces })
    }
}

impl Default for NetworkCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_collector_creation() {
        let collector = NetworkCollector::new();
        assert!(collector.system.networks().len() >= 0);
    }

    #[test]
    fn test_network_collection() {
        let mut collector = NetworkCollector::new();
        let metrics = collector.collect().unwrap();
        assert!(!metrics.interfaces.is_empty());
        for iface in &metrics.interfaces {
            assert!(!iface.name.is_empty());
            assert!(iface.received_bytes_per_sec >= 0);
            assert!(iface.transmitted_bytes_per_sec >= 0);
        }
    }
}
