import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { safeStorageName } from '../../common/security/file-upload';

@Injectable()
export class StorageService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
  }

  async uploadFile(
    folder: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
  ) {
    const safe = safeStorageName(contentType);
    const path = `${folder}/${safe}`;

    const { error } = await this.supabase.storage.from('tamkeenova').upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data: publicUrl } = this.supabase.storage.from('tamkeenova').getPublicUrl(path);

    return {
      path,
      url: publicUrl.publicUrl,
      original_name: fileName,
    };
  }
}
