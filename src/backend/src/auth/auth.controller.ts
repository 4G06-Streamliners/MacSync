import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OnboardingGuard } from './onboarding.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-code')
  requestCode(@Body('email') email: string) {
    return this.authService.requestVerificationCode(email);
  }

  @Post('check-email')
  checkEmail(@Body('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.loginWithPassword(body.email, body.password);
  }

  @Post('request-otp')
  requestOtp(@Body('email') email: string) {
    return this.authService.requestOtp(email);
  }

  @Post('verify-code')
  verifyCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyCode(body.email, body.code);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyOtp(body.email, body.code);
  }

  @Post('register')
  @UseGuards(OnboardingGuard)
  register(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      phone: string;
      program: string;
      password: string;
      confirmPassword?: string;
    },
    @Req() req: any,
  ) {
    return this.authService.registerUser(req.onboardingEmail, body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.authService.getUserInfo(req.user.sub);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout() {
    return { success: true };
  }
}
