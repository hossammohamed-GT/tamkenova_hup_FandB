import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {



  // Handle root
  @Get()
  root() {
    return {
      success: true,
      message: 'Tamkeenova API Running',
      version: '1.0.0',
    };
  }




  // Handle health
  @Get('health')
  health() {
    return {
      success: true,
      status: 'ok',
    };
  }
}
