import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new enterprise account (Hospital, Blood Bank, or Admin)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email & password to obtain a JWT token' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user identity and claims from token' })
  @ApiBearerAuth()
  async getProfile(@Headers('authorization') authHeader: string) {
    const token = (authHeader || '').replace('Bearer ', '').trim();
    if (!token) {
      return { success: false, message: 'No bearer token provided' };
    }
    const decoded = await this.authService.verifyToken(token);
    return {
      success: true,
      user: decoded,
    };
  }
}
