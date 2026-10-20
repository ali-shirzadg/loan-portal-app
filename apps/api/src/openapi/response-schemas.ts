import type { ApiResponseSchemaHost } from '@nestjs/swagger';

type SchemaObject = ApiResponseSchemaHost['schema'];

/**
 * OpenAPI schemas for the response contracts in libs/shared. Those are plain
 * interfaces (no runtime class for the swagger plugin to read), and the shared
 * lib must stay free of @nestjs/swagger, so the shapes are described here.
 */
const STATUS = {
  type: 'string',
  enum: ['PENDING', 'APPROVED', 'REJECTED'],
} satisfies SchemaObject;
const ISO_DATE = { type: 'string', format: 'date-time' } satisfies SchemaObject;
const MONEY = {
  type: 'string',
  pattern: '^\\d{1,10}(\\.\\d{1,2})?$',
  example: '25000.00',
} satisfies SchemaObject;

export const USER_SCHEMA = {
  type: 'object',
  required: ['id', 'email', 'fullName', 'role'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    fullName: { type: 'string' },
    role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
  },
} satisfies SchemaObject;

export const LOAN_PURPOSES_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    required: ['code', 'label'],
    properties: {
      code: { type: 'string', example: 'EDUCATION' },
      label: { type: 'string', example: 'Education' },
    },
  },
} satisfies SchemaObject;

const SUMMARY_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'fullName',
    'nricMasked',
    'loanAmount',
    'tenureMonths',
    'purposeLabel',
    'status',
    'createdAt',
    'decidedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    fullName: { type: 'string' },
    nricMasked: { type: 'string', example: '******-**-1234' },
    loanAmount: MONEY,
    tenureMonths: { type: 'integer' },
    purposeLabel: { type: 'string' },
    status: STATUS,
    createdAt: ISO_DATE,
    decidedAt: { ...ISO_DATE, nullable: true },
  },
} satisfies SchemaObject;

export const APPLICATION_DETAIL_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'fullName',
    'nric',
    'phone',
    'email',
    'monthlyIncome',
    'loanAmount',
    'tenureMonths',
    'purposeCode',
    'purposeLabel',
    'status',
    'creditCheckDueAt',
    'createdAt',
    'decidedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    fullName: { type: 'string' },
    nric: { type: 'string', example: '900101141234' },
    phone: { type: 'string', example: '+60123456789' },
    email: { type: 'string', format: 'email' },
    monthlyIncome: MONEY,
    loanAmount: MONEY,
    tenureMonths: { type: 'integer' },
    purposeCode: { type: 'string' },
    purposeLabel: { type: 'string' },
    status: STATUS,
    creditCheckDueAt: ISO_DATE,
    createdAt: ISO_DATE,
    decidedAt: { ...ISO_DATE, nullable: true },
  },
} satisfies SchemaObject;

export const APPLICATION_PAGE_SCHEMA = {
  type: 'object',
  required: ['items', 'page', 'pageSize', 'total'],
  properties: {
    items: { type: 'array', items: SUMMARY_SCHEMA },
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
  },
} satisfies SchemaObject;

export const STATUS_EVENT_SCHEMA = {
  type: 'object',
  description: 'The `data` of each server-sent message.',
  required: ['applicationId', 'status', 'decidedAt'],
  properties: {
    applicationId: { type: 'string', format: 'uuid' },
    status: STATUS,
    decidedAt: { ...ISO_DATE, nullable: true },
  },
} satisfies SchemaObject;

export const ERROR_SCHEMA = {
  type: 'object',
  required: ['statusCode', 'message'],
  properties: {
    statusCode: { type: 'integer', example: 400 },
    message: { type: 'string', example: 'Validation failed' },
    errors: {
      type: 'object',
      description: 'Per-field messages, keyed by property name.',
      additionalProperties: { type: 'array', items: { type: 'string' } },
    },
  },
} satisfies SchemaObject;
