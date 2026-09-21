import { Controller, Get } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Controller('test')
export class TestController {


  // Handle upload test
  @Get('upload')
  async uploadTest() {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );

    const fileContent = Buffer.from('Tamkeenova Storage Test', 'utf-8');

    const fileName = `test-${Date.now()}.txt`;

    const { data, error } = await supabase.storage
      .from('tamkeenova')
      .upload(fileName, fileContent, {
        contentType: 'text/plain',
      });

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data,
    };
  }
}
