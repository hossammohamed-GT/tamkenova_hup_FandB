import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {




  @Get()
  root() {
    return {
      success: true,
      message: 'Tamkeenova API Running',
      version: '1.0.0',
    };
  }





  @Get('health')
  health() {
    return {
      success: true,
      status: 'ok',
    };
  }
}
