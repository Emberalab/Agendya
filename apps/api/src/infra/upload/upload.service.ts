import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('cloudinaryUrl');

    if (!cloudinaryUrl) {
      throw new Error(
        'CLOUDINARY_URL no está configurada en las variables de entorno',
      );
    }

    cloudinary.config({
      url: cloudinaryUrl,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ronda-logos',
          transformation: [{ width: 200, height: 200, crop: 'limit' }],
        },
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
