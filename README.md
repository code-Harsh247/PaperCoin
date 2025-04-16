```
SELECT create_hypertable('orderbook_snapshots', 'timestamp', chunk_time_interval => interval '1 day');
```

