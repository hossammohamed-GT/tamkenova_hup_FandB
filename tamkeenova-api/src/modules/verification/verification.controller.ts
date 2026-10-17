import { Controller, Get, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verify')
export class VerificationController {


  constructor(private readonly verificationService: VerificationService) {}








  @Get('certificate/:code')
  async verifyCertificate(@Param('code') code: string) {
    return this.verificationService.verifyCertificate(code);
  }








  @Get('user/:username')
  async verifyUser(@Param('username') username: string) {
    return this.verificationService.verifyUser(username);
  }
}
