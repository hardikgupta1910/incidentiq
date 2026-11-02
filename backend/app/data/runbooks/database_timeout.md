# Database Connection Timeout Runbook

## Symptoms

- Database connection timed out
- High database connection pool usage
- Application unable to reach the database
- Requests waiting or failing during database queries

## Possible causes

- Database is overloaded
- Database connection pool is exhausted
- Network connectivity between application and database is impaired
- Database server has reached its connection limit
- A recent deployment introduced slow queries or connection leaks

## Suggested checks

1. Check database CPU, memory, disk, and active connection count.
2. Inspect application connection-pool usage and wait times.
3. Review recent deployments, configuration changes, and migrations.
4. Test database connectivity from the application host.
5. Identify slow, blocked, or long-running queries.
6. Check database error logs for connection limits or network failures.

## Escalation

Escalate to the database owner or infrastructure team if connectivity,
connection limits, or query performance remain degraded.