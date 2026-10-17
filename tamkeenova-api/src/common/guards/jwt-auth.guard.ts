import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [type, token, extra] = authHeader.split(' ');
    if (type !== 'Bearer' || !token || extra !== undefined) {
      throw new UnauthorizedException('Invalid token format');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      payload.sub.length > 128 ||
      !Number.isFinite(payload.exp) ||
      !Number.isSafeInteger(payload.tv) ||
      payload.tv < 0
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const userId = payload.sub;
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        email_verified: true,
        token_version: true,
        full_name: true,
        username: true,
        phone: true,
        whatsapp: true,
        profile_image: true,
        created_at: true,
      },
    });

    if (!user || !user.is_active || !user.email_verified) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const tokenVersion = typeof payload.tv === 'number' ? payload.tv : 0;
    if (tokenVersion !== (user.token_version ?? 0)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
      phone: user.phone,
      whatsapp: user.whatsapp,
      profile_image: user.profile_image,
      created_at: user.created_at,
    };

    return true;
  }
}
