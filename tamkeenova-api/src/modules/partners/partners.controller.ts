import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PartnersService } from './partners.service';
import { PartnerDto, UpdatePartnerDto } from './dto/partner.dto';
@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}
  @Get() listPublic() { return this.service.listPublic(); }
  @Get('admin') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') listAll() { return this.service.listAll(); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') create(@Body() dto: PartnerDto) { return this.service.create(dto); }
  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) { return this.service.update(id, dto); }
  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') remove(@Param('id') id: string) { return this.service.remove(id); }
}
