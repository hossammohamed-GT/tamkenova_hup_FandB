import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { AdminService } from './admin.service';

import { ChangeRoleDto } from './dto/change-role.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { RejectReasonDto } from './dto/reject-reason.dto';
import { TrainerCertificateDto } from './dto/trainer-certificate.dto';
import { TrainerDocumentDto } from './dto/trainer-document.dto';
import { UpdateTrainerAdminDto } from './dto/update-trainer-admin.dto';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CorporateStatusDto } from './dto/corporate-status.dto';
import { SpecializationDto } from './dto/specialization.dto';
import { UpdateProgramDto } from '../trainers/dto/update-program.dto';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {


  constructor(private readonly adminService: AdminService) {}





  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({ search, role, is_active, page, limit });
  }



  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }



  @Patch('users/:id/role')
  changeUserRole(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.adminService.changeUserRole(admin.sub, id, dto);
  }



  @Patch('users/:id/status')
  setUserActive(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.adminService.setUserActive(admin.sub, id, dto);
  }



  @Get('users/:id/activity')
  getUserActivity(@Param('id') id: string) {
    return this.adminService.getUserActivity(id);
  }





  @Get('trainers')
  listTrainers(@Query('status') status?: string) {
    return this.adminService.listTrainers(status);
  }



  @Get('trainers/:id')
  getTrainer(@Param('id') id: string) {
    return this.adminService.getTrainer(id);
  }



  @Patch('trainers/:id/approve')
  approveTrainer(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.approveTrainer(admin.sub, id);
  }



  @Patch('trainers/:id/reject')
  rejectTrainer(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
  ) {
    return this.adminService.rejectTrainer(admin.sub, id, dto);
  }



  @Patch('trainers/:id/suspend')
  suspendTrainer(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.suspendTrainer(admin.sub, id);
  }



  @Patch('trainers/:id/activate')
  activateTrainer(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.activateTrainer(admin.sub, id);
  }



  @Patch('trainers/:id')
  updateTrainer(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateTrainerAdminDto,
  ) {
    return this.adminService.updateTrainer(admin.sub, id, dto);
  }



  @Post('trainers/:id/certificates')
  addTrainerCertificate(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: TrainerCertificateDto,
  ) {
    return this.adminService.addTrainerCertificate(admin.sub, id, dto);
  }



  @Delete('trainers/certificates/:id')
  deleteTrainerCertificate(@Param('id') id: string) {
    return this.adminService.deleteTrainerCertificate(id);
  }



  @Post('trainers/:id/documents')
  addTrainerDocument(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: TrainerDocumentDto,
  ) {
    return this.adminService.addTrainerDocument(admin.sub, id, dto);
  }



  @Delete('trainers/documents/:id')
  deleteTrainerDocument(@Param('id') id: string) {
    return this.adminService.deleteTrainerDocument(id);
  }





  @Get('volunteers')
  listVolunteers(@Query('status') status?: string) {
    return this.adminService.listVolunteers(status);
  }



  @Get('volunteers/:id')
  getVolunteer(@Param('id') id: string) {
    return this.adminService.getVolunteer(id);
  }



  @Patch('volunteers/:id/approve')
  approveVolunteer(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.approveVolunteer(admin.sub, id);
  }



  @Patch('volunteers/:id/reject')
  rejectVolunteer(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
  ) {
    return this.adminService.rejectVolunteer(admin.sub, id, dto);
  }





  @Get('certificates')
  listCertificates() {
    return this.adminService.listCertificates();
  }



  @Post('certificates')
  issueCertificate(
    @CurrentUser() admin: any,
    @Body() dto: IssueCertificateDto,
  ) {
    return this.adminService.issueCertificate(admin.sub, dto);
  }



  @Patch('certificates/:id')
  updateCertificate(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateDto,
  ) {
    return this.adminService.updateCertificate(id, dto);
  }



  @Patch('certificates/:id/revoke')
  revokeCertificate(@Param('id') id: string) {
    return this.adminService.revokeCertificate(id);
  }



  @Delete('certificates/:id')
  deleteCertificate(@Param('id') id: string) {
    return this.adminService.deleteCertificate(id);
  }





  @Get('corporate-requests')
  listCorporateRequests(@Query('status') status?: string) {
    return this.adminService.listCorporateRequests(status);
  }



  @Get('corporate-requests/:id')
  getCorporateRequest(@Param('id') id: string) {
    return this.adminService.getCorporateRequest(id);
  }



  @Patch('corporate-requests/:id/status')
  updateCorporateRequestStatus(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: CorporateStatusDto,
  ) {
    return this.adminService.updateCorporateRequestStatus(admin.sub, id, dto);
  }





  @Get('specializations/requests')
  listSpecializationRequests() {
    return this.adminService.listSpecializationRequests();
  }



  @Patch('specializations/requests/:id/approve')
  approveSpecializationRequest(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.approveSpecializationRequest(admin.sub, id);
  }



  @Patch('specializations/requests/:id/reject')
  rejectSpecializationRequest(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.rejectSpecializationRequest(admin.sub, id);
  }



  @Post('specializations')
  createSpecialization(
    @CurrentUser() admin: any,
    @Body() dto: SpecializationDto,
  ) {
    return this.adminService.createSpecialization(admin.sub, dto);
  }



  @Patch('specializations/:id')
  updateSpecialization(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: SpecializationDto,
  ) {
    return this.adminService.updateSpecialization(admin.sub, id, dto);
  }



  @Delete('specializations/:id')
  deleteSpecialization(
    @CurrentUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.deleteSpecialization(admin.sub, id);
  }





  @Get('programs')
  listPrograms() {
    return this.adminService.listPrograms();
  }



  @Patch('programs/:id')
  updateProgram(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.adminService.updateProgram(admin.sub, id, dto);
  }


  @Patch('programs/:id/approve')
  approveProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.approveProgram(admin.sub, id);
  }

  @Patch('programs/:id/reject')
  rejectProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.rejectProgram(admin.sub, id);
  }



  @Patch('programs/:id/hide')
  hideProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.setProgramVisibility(admin.sub, id, false);
  }



  @Patch('programs/:id/show')
  showProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.setProgramVisibility(admin.sub, id, true);
  }



  @Delete('programs/:id')
  deleteProgram(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deleteProgram(admin.sub, id);
  }





  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
