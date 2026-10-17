import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {


  constructor(private readonly prisma: PrismaService) {}



  findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }



  createUser(data: any) {
    return this.prisma.users.create({
      data,
    });
  }



  createOtp(data: any) {
    return this.prisma.email_otps.create({
      data,
    });
  }



  getValidOtp(email: string, otp: string) {
    return this.prisma.email_otps.findFirst({
      where: {
        otp_code: otp,
        is_used: false,
        users: {
          email,
        },
      },
      include: {
        users: true,
      },
    });
  }



  verifyUser(userId: string) {
    return this.prisma.users.update({
      where: {
        id: userId,
      },
      data: {
        email_verified: true,
      },
    });
  }



  markOtpUsed(id: string) {
    return this.prisma.email_otps.update({
      where: {
        id,
      },
      data: {
        is_used: true,
      },
    });
  }
}
