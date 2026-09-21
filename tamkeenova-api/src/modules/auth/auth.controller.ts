import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterVolunteerDto } from './dto/register-volunteer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';


@Controller('auth')
export class AuthController {

  // Initialize instance
  constructor(private readonly authService: AuthService) {}



  // Handle register
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }



  // Handle register volunteer
  @Post('register/volunteer')
  registerVolunteer(@Body() dto: RegisterVolunteerDto) {
    return this.authService.registerVolunteer(dto);
  }



  // Handle verify email
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }



  // Handle resend otp
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }



  // Handle login
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }



  // Handle get me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
    };
  }



  // Handle health
  @Get('health')
  health() {
    return {
      success: true,
      message: 'API is running',
    };
  }


}
