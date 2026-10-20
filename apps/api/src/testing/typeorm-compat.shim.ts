// @nestjs/typeorm resolves these with import.meta, which Jest's CommonJS runtime
// cannot parse. TypeORM 1.x removed both symbols, so undefined is the real value.
export const Connection = undefined;
export const AbstractRepository = undefined;
