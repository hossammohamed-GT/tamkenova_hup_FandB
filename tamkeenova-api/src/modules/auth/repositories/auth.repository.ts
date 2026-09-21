import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}


  // Handle find user by email
  findUserByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }


  // Handle create user
  createUser(data: any) {
    return this.prisma.users.create({
      data,
    });
  }


  // Handle create otp
  createOtp(data: any) {
    return this.prisma.email_otps.create({
      data,
    });
  }


  // Handle get valid otp
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


  // Handle verify user
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


  // Handle mark otp used
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
