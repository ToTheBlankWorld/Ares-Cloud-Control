use crate::error::{AgentError, Result};
use config::{Config, ConfigError, File};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_host() -> String {
    "127.0.0.1".to_string()
}

fn default_port() -> u16 {
    9000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    #[serde(default = "default_interval_ms")]
    pub interval_ms: u64,
    #[serde(default = "default_process_limit")]
    pub process_limit: usize,
}

fn default_interval_ms() -> u64 {
    1000
}

fn default_process_limit() -> usize {
    100
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub token_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_docker_socket")]
    pub socket: String,
}

fn default_true() -> bool {
    false
}

fn default_docker_socket() -> String {
    "/var/run/docker.sock".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub monitoring: MonitoringConfig,
    pub auth: AuthConfig,
    #[serde(default)]
    pub gpu: GpuConfig,
    #[serde(default)]
    pub docker: DockerConfig,
}

impl AppConfig {
    pub fn load(config_path: Option<PathBuf>) -> Result<Self> {
        let mut builder = Config::builder()
            .set_default("server.host", default_host())?
            .set_default("server.port", default_port())?
            .set_default("monitoring.interval_ms", default_interval_ms())?
            .set_default("monitoring.process_limit", default_process_limit())?
            .set_default("gpu.enabled", false)?
            .set_default("docker.enabled", false)?
            .set_default("docker.socket", default_docker_socket())?;

        if let Some(path) = config_path {
            if path.exists() {
                builder = builder.add_source(File::from(path).required(true));
            } else {
                return Err(AgentError::InvalidConfig(format!(
                    "Config file not found: {}",
                    path.display()
                )));
            }
        } else {
            let default_paths = [
                "/etc/remotebtop/config.toml",
                "/usr/local/etc/remotebtop/config.toml",
                "config.toml",
            ];
            for path in default_paths {
                if std::path::Path::new(path).exists() {
                    builder = builder.add_source(File::from(path).required(false));
                    break;
                }
            }
        }

        let config = builder.build()?;
        config.try_deserialize().map_err(AgentError::Config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_config_loading() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(
            temp_file,
            r#"
            [server]
            host = "127.0.0.1"
            port = 9000

            [monitoring]
            interval_ms = 1000
            process_limit = 100

            [auth]
            token_file = "/etc/remotebtop/token"

            [gpu]
            enabled = true

            [docker]
            enabled = true
            socket = "/var/run/docker.sock"
            "#
        )
        .unwrap();

        let config = AppConfig::load(Some(temp_file.path().to_path_buf())).unwrap();
        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 9000);
        assert_eq!(config.monitoring.interval_ms, 1000);
        assert_eq!(config.monitoring.process_limit, 100);
        assert_eq!(config.auth.token_file, "/etc/remotebtop/token");
        assert!(config.gpu.enabled);
        assert!(config.docker.enabled);
        assert_eq!(config.docker.socket, "/var/run/docker.sock");
    }

    #[test]
    fn test_config_defaults() {
        let config = AppConfig::load(None).unwrap();
        assert_eq!(config.server.host, "127.0.0.1");
        assert_eq!(config.server.port, 9000);
        assert_eq!(config.monitoring.interval_ms, 1000);
        assert_eq!(config.monitoring.process_limit, 100);
        assert!(!config.gpu.enabled);
        assert!(!config.docker.enabled);
        assert_eq!(config.docker.socket, "/var/run/docker.sock");
    }
}
