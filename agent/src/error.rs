use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Configuration error: {0}")]
    Config(#[from] config::ConfigError),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("TOML parse error: {0}")]
    Toml(#[from] toml::de::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("NVML error: {0}")]
    Nvml(#[from] nvml_wrapper::error::NvmlError),

    #[error("Docker error: {0}")]
    Docker(#[from] bollard::errors::Error),

    #[error("System info error: {0}")]
    SysInfo(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Metrics collection error: {0}")]
    MetricsCollection(String),

    #[error("WebSocket error: {0}")]
    WebSocket(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, AgentError>;
