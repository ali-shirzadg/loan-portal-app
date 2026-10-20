// These Nest packages ship ESM only; Jest needs them compiled to CommonJS.
const esmOnlyPackages = [
  '@nestjs/jwt',
  '@nestjs/typeorm',
  '@nestjs/bullmq',
  '@nestjs/bull-shared',
  '@nestjs/cache-manager',
  'cache-manager',
  'keyv',
  'cacheable',
  '@cacheable',
  'hookified',
  'qified',
];

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    'typeorm-compat\\.js$': '<rootDir>/src/testing/typeorm-compat.shim.ts',
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${esmOnlyPackages.join('|')})/)`,
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
