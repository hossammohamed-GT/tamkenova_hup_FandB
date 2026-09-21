import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';


@Injectable()
export class StorageService {
  private supabase;


  // Initialize instance
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
  }



  // Handle upload file
  async uploadFile(
    folder: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
  ) {
    const path = `${folder}/${Date.now()}-${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('tamkeenova')
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrl } = this.supabase.storage
      .from('tamkeenova')
      .getPublicUrl(path);

    return {
      path,
      url: publicUrl.publicUrl,
    };
  }
}
