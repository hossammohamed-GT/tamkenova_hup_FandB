import { Controller, Get, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verify')
export class VerificationController {

  // Initialize instance
  constructor(private readonly verificationService: VerificationService) {}







  // Handle verify certificate
  @Get('certificate/:code')
  async verifyCertificate(@Param('code') code: string) {
    return this.verificationService.verifyCertificate(code);
  }







  // Handle verify user
  @Get('user/:username')
  async verifyUser(@Param('username') username: string) {
    return this.verificationService.verifyUser(username);
  }
}
