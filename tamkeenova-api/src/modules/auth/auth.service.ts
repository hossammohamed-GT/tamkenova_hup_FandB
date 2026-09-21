import { BadRequestException, Injectable } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dto/register.dto';
import { RegisterVolunteerDto } from './dto/register-volunteer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

import { AuthRepository } from './auth.repository';
import { generateOtp } from './utils/otp.util';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';


@Injectable()
export class AuthService {

  // Initialize instance
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}



  // Handle register
  async register(dto: RegisterDto) {
    const emailExists = await this.authRepository.findUserByEmail(dto.email);

    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    const usernameExists = await this.authRepository.findUserByUsername(
      dto.username,
    );

    if (usernameExists) {
      throw new BadRequestException('Username already exists');
    }

    const phoneExists = await this.authRepository.findUserByPhone(dto.phone);

    if (phoneExists) {
      throw new BadRequestException('Phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.authRepository.createUser({
      full_name: dto.full_name,
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      role: dto.role,
    });

    if (dto.role === 'TRAINER') {
      let specializationId: string | null = null;

      if (dto.specialization_id) {
        const specialization = await this.authRepository.findSpecializationById(
          dto.specialization_id,
        );

        if (!specialization) {
          throw new BadRequestException('Specialization not found');
        }

        specializationId = specialization.id;
      } else if (dto.specialization_name_ar && dto.specialization_name_en) {
        const specialization = await this.authRepository.createSpecialization({
          name_ar: dto.specialization_name_ar,
          name_en: dto.specialization_name_en,
        });

        specializationId = specialization.id;
      }

      const trainer = await this.authRepository.createTrainer({
        user_id: user.id,

        slug: dto.username + '-' + Math.floor(Math.random() * 100000),

        trainer_status: 'PENDING',

        specialization_id: specializationId,

        bio_ar: dto.bio_ar,
        bio_en: dto.bio_en,

        description_ar: dto.description_ar,
        description_en: dto.description_en,

        cover_letter: dto.cover_letter,

        linkedin_url: dto.linkedin_url,
        facebook_url: dto.facebook_url,
        website_url: dto.website_url,
        portfolio_url: dto.portfolio_url,

        consultation_price_from: dto.consultation_price_from || 0,

        consultation_price_to: dto.consultation_price_to || 0,

        consultation_duration: dto.consultation_duration || 60,
      });

      await this.authRepository.createTrainerCertificates(
        trainer.id,
        dto.certificate_urls || [],
      );

      await this.authRepository.createTrainerDocuments(
        trainer.id,
        dto.documents || [],
      );

      const admin = await this.authRepository.findFirstAdmin();

      if (admin) {
        await this.mailService.sendTrainerRequestEmail(
          admin.email,
          dto.full_name,
          dto.email,
        );

        await this.authRepository.createNotification({
          user_id: admin.id,

          title: 'New Trainer Request',

          message: `${dto.full_name} submitted a trainer application`,
        });
      }
    }

    const otp = generateOtp();

    await this.authRepository.createOtp({
      user_id: user.id,
      otp_code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.mailService.sendOtp(user.email, otp);

    return {
      success: true,
      message:
        dto.role === 'TRAINER'
          ? 'Trainer request submitted successfully. Verify your email.'
          : 'Account created successfully. Verify your email.',

      user_id: user.id,
    };
  }



  // Handle register volunteer
  async registerVolunteer(dto: RegisterVolunteerDto) {
    const emailExists = await this.authRepository.findUserByEmail(dto.email);

    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    const usernameExists = await this.authRepository.findUserByUsername(
      dto.username,
    );

    if (usernameExists) {
      throw new BadRequestException('Username already exists');
    }

    const phoneExists = await this.authRepository.findUserByPhone(dto.phone);

    if (phoneExists) {
      throw new BadRequestException('Phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.authRepository.createUser({
      full_name: dto.full_name,
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      role: 'VOLUNTEER',
    });

    await this.authRepository.createVolunteer({
      user_id: user.id,
      volunteer_status: 'PENDING',
      bio: dto.bio || null,
    });

    const admin = await this.authRepository.findFirstAdmin();

    if (admin) {
      await this.mailService.sendVolunteerRequestEmail(
        admin.email,
        dto.full_name,
        dto.email,
      );

      await this.authRepository.createNotification({
        user_id: admin.id,
        title: 'New Volunteer Request',
        message: `${dto.full_name} submitted a volunteer application`,
      });
    }

    const otp = generateOtp();

    await this.authRepository.createOtp({
      user_id: user.id,
      otp_code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.mailService.sendOtp(user.email, otp);

    return {
      success: true,
      message:
        'Volunteer request submitted successfully. Verify your email. Your account will be reviewed by an admin.',
      user_id: user.id,
    };
  }



  // Handle verify email
  async verifyEmail(dto: VerifyEmailDto) {
    const otpRecord = await this.authRepository.getValidOtp(dto.email, dto.otp);

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP');
    }

    if (otpRecord.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('OTP expired');
    }

    await this.authRepository.verifyUser(otpRecord.user_id);

    await this.authRepository.markOtpUsed(otpRecord.id);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }



  // Handle resend otp
  async resendOtp(dto: { email: string }) {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.email_verified) {
      throw new BadRequestException('Email already verified');
    }

    await this.authRepository.invalidateOldOtps(user.id);

    const otp = generateOtp();

    await this.authRepository.createOtp({
      user_id: user.id,
      otp_code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.mailService.sendOtp(user.email, otp);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }



  // Handle login
  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserForLogin(dto.email);

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    if (!user.email_verified) {
      throw new BadRequestException('Email not verified');
    }

    if (!user.is_active) {
      throw new BadRequestException('Account disabled');
    }

    const passwordMatched = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatched) {
      throw new BadRequestException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.authRepository.updateLastLogin(user.id);

    return {
      success: true,
      message: 'Login successful',

      data: {
        access_token: accessToken,

        user: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    };
  }
}
