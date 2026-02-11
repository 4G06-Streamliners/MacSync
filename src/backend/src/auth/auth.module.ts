/**
 * @file auth.module.ts
 * @brief User Authorization Module (M8) - NestJS Module Definition
 * @module M8
 * @description
 * Exports the authentication service as a library module for use by other modules
 * Implements the User Authorization Module as defined in the MIS
 */

import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

/**
 * @class AuthModule
 * @brief NestJS module definition for User Authorization (M8)
 * @exports AuthService for use by other modules (especially M2)
 * @exports AuthController as optional REST API interface
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // Export for use by other modules
})
export class AuthModule {}
