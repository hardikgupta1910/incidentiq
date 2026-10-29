# MySQL Database Connection Failures

## When to use

Use this runbook when logs show one or more of these signals:

- Database connection timed out.
- Connection pool is high or exhausted.
- Cannot acquire a database connection.
- MySQL host is unreachable.
- Too many connections.
- Repeated database connection retries.

## Likely causes

1. The application connection pool has no available connections.
2. Slow queries or long transactions hold connections too long.
3. MySQL has reached its `max_connections` limit.
4. Network connectivity between the application and MySQL is failing.
5. MySQL resource usage or health is degraded.

## First checks

1. Confirm that the affected service can reach the MySQL host and port.
2. Check active MySQL connections and long-running queries.
3. Check application connection-pool active, idle, pending, and maximum connection metrics.
4. Compare incident timing with deployments, configuration changes, and traffic spikes.
5. Check MySQL CPU, memory, disk, and error logs.

## MySQL checks

```sql
SHOW STATUS LIKE 'Threads_connected';
```

```sql
SHOW VARIABLES LIKE 'max_connections';
```

```sql
SHOW FULL PROCESSLIST;
```

```sql
SELECT
    USER,
    HOST,
    COUNT(*) AS current_connections
FROM performance_schema.accounts
GROUP BY USER, HOST
ORDER BY current_connections DESC;
```

```sql
SELECT
    PROCESSLIST_ID,
    PROCESSLIST_USER,
    PROCESSLIST_HOST,
    PROCESSLIST_DB,
    PROCESSLIST_COMMAND,
    PROCESSLIST_TIME,
    PROCESSLIST_STATE,
    PROCESSLIST_INFO
FROM performance_schema.processlist
WHERE PROCESSLIST_COMMAND <> 'Sleep'
ORDER BY PROCESSLIST_TIME DESC;
```

## HikariCP checks

Inspect these Spring Boot properties and metrics:

```properties
spring.datasource.hikari.maximum-pool-size
spring.datasource.hikari.minimum-idle
spring.datasource.hikari.connection-timeout
spring.datasource.hikari.max-lifetime
```

Check whether active connections equal `maximum-pool-size` and whether pending connection requests are increasing.

## Safe mitigation

- Do not increase the connection-pool size blindly.
- Identify long-running queries and transactions first.
- Verify MySQL capacity before increasing application pool limits.
- Check that combined pool sizes across all service instances do not exceed MySQL capacity.
- Restart only the affected service if operational policy permits it.
- Escalate when MySQL reaches connection limits or has degraded health.

## Evidence required before conclusion

Timeout logs alone do not prove a MySQL failure. Confirm using MySQL connection counts, process-list data, application pool metrics, MySQL health metrics, or network diagnostics.