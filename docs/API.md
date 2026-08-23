# RemoteBtop Agent API Documentation

## Base URL

```
http://127.0.0.1:9000
```

## Authentication

All endpoints except `/api/health` require authentication.

### Header-Based Auth

```
Authorization: Bearer <token>
```

or

```
Authorization: Token <token>
```

The token is read from the file specified in `auth.token_file` (default: `/etc/remotebtop/token`).

### WebSocket Auth

WebSocket connections use the same header-based authentication during the upgrade request.

## Endpoints

### Health Check (No Auth Required)

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime_seconds": 3600
}
```

### System Status

```
GET /api/status
```

**Response:**
```json
{
  "healthy": true,
  "collectors": {
    "cpu": true,
    "memory": true,
    "disk": true,
    "network": true,
    "processes": true,
    "gpu": true,
    "docker": true,
    "temperature": true
  }
}
```

### System Information

```
GET /api/system
```

**Response:**
```json
{
  "hostname": "server01",
  "os_name": "Ubuntu",
  "os_version": "22.04.3 LTS",
  "kernel_version": "5.15.0-91-generic",
  "architecture": "x86_64",
  "uptime_seconds": 86400,
  "boot_time": "2024-01-15T10:30:00Z",
  "agent_version": "0.1.0",
  "server_timestamp": "2024-01-16T10:30:00Z"
}
```

### CPU Metrics

```
GET /api/cpu
```

**Response:**
```json
{
  "total_usage_percent": 23.5,
  "cores": [
    {
      "id": 0,
      "usage_percent": 15.2,
      "frequency_mhz": 3200,
      "temperature_celsius": 45.0
    }
  ],
  "load_average": {
    "one": 1.23,
    "five": 1.45,
    "fifteen": 1.67
  },
  "core_count": 8,
  "thread_count": 16,
  "frequencies_mhz": [3200, 3100, 3200, 3200, 3100, 3200, 3200, 3100]
}
```

### Memory Metrics

```
GET /api/memory
```

**Response:**
```json
{
  "memory": {
    "total_bytes": 34359738368,
    "used_bytes": 8589934592,
    "available_bytes": 25769803776,
    "free_bytes": 17179869184,
    "cached_bytes": 8589934592
  },
  "swap": {
    "total_bytes": 4294967296,
    "used_bytes": 0,
    "free_bytes": 4294967296
  }
}
```

### GPU Metrics

```
GET /api/gpu
```

**Response (NVIDIA available):**
```json
{
  "available": true,
  "devices": [
    {
      "index": 0,
      "name": "NVIDIA GeForce RTX 3080",
      "utilization_percent": 15.0,
      "memory_total_bytes": 10737418240,
      "memory_used_bytes": 2147483648,
      "memory_free_bytes": 8589934592,
      "temperature_celsius": 42.0,
      "power_usage_watts": 85.5,
      "power_limit_watts": 320.0,
      "gpu_clock_mhz": 1800,
      "memory_clock_mhz": 9500,
      "fan_speed_percent": 35.0
    }
  ]
}
```

**Response (No GPU):**
```json
{
  "available": false,
  "devices": null
}
```

### Disk Metrics

```
GET /api/disk
```

**Response:**
```json
{
  "filesystems": [
    {
      "mount_point": "/",
      "filesystem": "ext4",
      "total_bytes": 500107862016,
      "used_bytes": 150323859456,
      "available_bytes": 349784002560,
      "usage_percent": 30.1
    }
  ],
  "io": {
    "read_bytes_per_sec": 1048576,
    "write_bytes_per_sec": 524288,
    "read_ops_per_sec": 120,
    "write_ops_per_sec": 80
  }
}
```

### Network Metrics

```
GET /api/network
```

**Response:**
```json
{
  "interfaces": [
    {
      "name": "eth0",
      "ipv4_addresses": ["192.168.1.100"],
      "ipv6_addresses": ["fe80::1"],
      "received_bytes": 10737418240,
      "transmitted_bytes": 5368709120,
      "received_bytes_per_sec": 1048576,
      "transmitted_bytes_per_sec": 524288,
      "is_up": true,
      "is_loopback": false
    }
  ]
}
```

### Process List

```
GET /api/processes?sort_by=cpu&limit=50&offset=0
```

**Query Parameters:**
- `sort_by`: `cpu` | `memory` | `pid` | `name` (default: `cpu`)
- `limit`: number of processes (default: 100)
- `offset`: pagination offset (default: 0)

**Response:**
```json
[
  {
    "pid": 1234,
    "name": "nginx",
    "command": "nginx: master process nginx",
    "user": "www-data",
    "cpu_percent": 5.2,
    "memory_bytes": 52428800,
    "thread_count": 4,
    "state": "sleeping",
    "start_time": 1705315200,
    "run_time": 86400
  }
]
```

### Docker Metrics

```
GET /api/docker
```

**Response (Docker available):**
```json
{
  "available": true,
  "containers": [
    {
      "id": "abc123",
      "name": "web-server",
      "image": "nginx:latest",
      "status": "Up 2 hours",
      "state": "running",
      "cpu_percent": 2.5,
      "memory_bytes": 52428800,
      "memory_limit_bytes": 1073741824,
      "network_rx_bytes": 1048576,
      "network_tx_bytes": 524288,
      "restart_count": 0,
      "created": "2024-01-15T10:30:00Z",
      "started_at": "2024-01-15T10:31:00Z"
    }
  ]
}
```

**Response (No Docker):**
```json
{
  "available": false,
  "containers": null
}
```

### Complete Metrics Snapshot

```
GET /api/metrics
```

Returns all metrics in a single response (equivalent to the WebSocket payload).

## WebSocket

```
GET /ws
```

The WebSocket sends a complete metrics snapshot approximately once per second (matching the collection interval).

### Message Format

Each message is a JSON object matching the `/api/metrics` response structure.

### Connection Lifecycle

1. Client connects with `Authorization` header
2. Server sends metrics snapshot every ~1 second
3. Client can send ping frames (server responds with pong)
4. Either side can close the connection

### Example Client (JavaScript)

```javascript
const token = "your-token-here";
const ws = new WebSocket("ws://127.0.0.1:9000/ws", {
  headers: { "Authorization": `Bearer ${token}` }
});

ws.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  console.log("CPU:", metrics.cpu.total_usage_percent);
  console.log("Memory:", metrics.memory.used_bytes / metrics.memory.total_bytes * 100, "%");
};

ws.onclose = () => console.log("Disconnected");
```

## Error Responses

All authenticated endpoints return standard HTTP status codes:

- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Collection failure (check logs)

Error body:
```json
{
  "error": "Authentication failed"
}
```

## Rate Limiting

No explicit rate limiting is implemented. The WebSocket naturally limits to ~1 message/second. REST endpoints can be called as frequently as needed but will return cached snapshot data.

## Data Freshness

All REST and WebSocket endpoints read from a shared in-memory snapshot updated every `interval_ms` (default 1000ms). The `server_timestamp` field in `/api/system` and `/api/metrics` indicates when the snapshot was last updated.