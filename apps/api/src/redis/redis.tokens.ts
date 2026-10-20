/** Connection for commands (PUBLISH, PING). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
/** Dedicated connection: a connection in subscriber mode cannot run other commands. */
export const REDIS_SUBSCRIBER = Symbol('REDIS_SUBSCRIBER');
