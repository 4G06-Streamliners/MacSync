/**
 * @file index.ts
 * @brief Main barrel file for User Authorization Module (M8)
 * @module M8
 * @description
 * Exports all public interfaces, types, exceptions, constants, and services
 * This is the primary entry point for other modules to interact with M8
 */

// Export types
export * from './types';

// Export exceptions
export * from './exceptions';

// Export constants
export * from './constants';

// Export services
export * from './services';

// Export controllers
export * from './controllers';

// Export module
export * from './auth.module';
