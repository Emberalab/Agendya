import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  private configured = false;

  constructor(private configService: ConfigService) {}

  private ensureConfigured(): void {
    if (this.configured) {
      return;
    }

    const cloudinaryUrl = this.configService.get<string>('cloudinaryUrl');
    if (!cloudinaryUrl) {
      throw new ServiceUnavailableException(
        'CLOUDINARY_URL no está configurada en las variables de entorno',
      );
    }

    cloudinary.config({ url: cloudinaryUrl });
    this.configured = true;
  }

  async uploadImage(
    file: Express.Multer.File,
    variant: 'logo' | 'cover' = 'logo',
  ): Promise<string> {
    this.ensureConfigured();

    const options =
      variant === 'cover'
        ? {
            folder: 'ronda-covers',
            transformation: [{ width: 1600, height: 600, crop: 'limit' }],
          }
        : {
            folder: 'ronda-logos',
            transformation: [{ width: 400, height: 400, crop: 'limit' }],
          };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            return reject(new Error(error.message));
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned no result'));
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
