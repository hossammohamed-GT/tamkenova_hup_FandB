import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoryService } from './category.service';
import { CategoryDto, CategoryVisibilityDto } from './category.dto';
@Controller('admin/course-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}
  @Get() @Header('Cache-Control', 'private, no-store') list() {
    return this.service.list();
  }
  @Post() create(@Body() dto: CategoryDto) {
    return this.service.save(dto);
  }
  @Put(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryDto,
  ) {
    return this.service.save(dto, id);
  }
  @Patch(':id/visibility') visibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CategoryVisibilityDto,
  ) {
    return this.service.visibility(id, dto.is_active);
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  image(@UploadedFile() file: Express.Multer.File) {
    return this.service.upload(file);
  }
}
