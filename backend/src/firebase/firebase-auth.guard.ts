import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseService: FirebaseService,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header. Bearer token required.',
      );
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Token missing from authorization header');
    }

    // 1. Check local enterprise JWT token first
    if (this.jwtService) {
      try {
        const jwtPayload = this.jwtService.verify(token);
        if (jwtPayload) {
          request.user = {
            uid: jwtPayload.sub,
            id: jwtPayload.sub,
            email: jwtPayload.email,
            role: jwtPayload.role,
            ...jwtPayload,
          };
          return true;
        }
      } catch {
        // Fall through to Firebase check
      }
    }

    // 2. Check Firebase ID token
    try {
      const decodedToken = await this.firebaseService.auth.verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
