import type { Pool, PoolClient } from 'pg';

// repository가 일반 pool과 트랜잭션 client를 같은 방식으로 받을 수 있게 한다.
export type DatabaseClient = Pool | PoolClient;
