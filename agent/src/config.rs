use crate::error::{AgentError, Result};
use config::{Config, ConfigError, File};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CorsConfig {
    #[serde(default)]
    pub allowed_origins: Vec<String>,
    #[serde(default = "default_allowed_methods")]
    pub allowed_methods: Vec<String>,
    #[serde(default = "default_allowed_headers")]
    pub allowed_headers: Vec<String>,
    #[serde(default)]
    pub allow_credentials: bool,
    #[serde(default = "default_max_age")]
    pub max_age: u64,
}

fn default_allowed_methods() -> Vec<String> {
    vec!["GET".to_string(), "POST".to_string(), "OPTIONS".to_string()]
}

fn default_allowed_headers() -> Vec<String> {
    vec!["Authorization".to_string(), "Content-Type".to_string()]
}

fn default_max_age() -> u64 {
    86400
}

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthConfig {
    #[serde(default = "default_token_file")]
    pub token_file: String,
}

fn default_token_file() -> String {
    "/etc/remotebtop/token".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GpuConfig {
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DockerConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_docker_socket")]
    pub socket: String,
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
    #[serde(default)]
    pub cors: CorsConfig,
}

impl AppConfig {
    pub fn load(config_path: Option<PathBuf>) -> Result<Self> {
        let mut builder = Config::builder()
            .set_default("server.host", default_host())?
            .set_default("server.port", default_port())?
            .set_default("monitoring.interval_ms", default_interval_ms())?
            .set_default("monitoring.process_limit", default_process_limit() as i64)?
            .set_default("gpu.enabled", false)?
            .set_default("docker.enabled", false)?
            .set_default("docker.socket", default_docker_socket())?
            .set_default("auth.token_file", default_token_file())?
            .set_default("cors.allowed_origins", Vec::<String>::new())?
            .set_default("cors.allowed_methods", default_allowed_methods())?
            .set_default("cors.allowed_headers", default_allowed_headers())?
            .set_default("cors.allow_credentials", false)?
            .set_default("cors.max_age", default_max_age())?;

        if let Some(path) = config_path {
            if path.exists() {
                builder = builder.add_source(File::from(path.as_path()).required(true));
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
                    builder =
                        builder.add_source(File::from(std::path::Path::new(path)).required(false));
                    break;
                }
            }
        }

        let config = builder.build()?;
        config
            .try_deserialize()
            .map_err(|e| AgentError::Config(ConfigError::Message(e.to_string())))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_config_loading() {
        let mut temp_file = NamedTempFile::with_suffix(".toml").unwrap();
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

            [cors]
            allowed_origins = ["http://localhost:5173"]
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
        assert_eq!(config.cors.allowed_origins, vec!["http://localhost:5173"]);
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
        assert!(config.cors.allowed_origins.is_empty());
        assert_eq!(config.cors.allowed_methods, vec!["GET", "POST", "OPTIONS"]);
        assert_eq!(
            config.cors.allowed_headers,
            vec!["Authorization", "Content-Type"]
        );
        assert!(!config.cors.allow_credentials);
        assert_eq!(config.cors.max_age, 86400);
    }
}
