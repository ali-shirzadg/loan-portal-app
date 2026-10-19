// Shared between Jest globalSetup and globalTeardown via globalThis.
declare global {
  var __TEARDOWN_MESSAGE__: string;
}

export {};
