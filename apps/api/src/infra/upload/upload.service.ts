import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
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
        'CLOUDINARY_URL no está configurada en las variables de entorno.',
      );
    }

    // The SDK's `config({ url })` does not parse the URL — pull the parts out
    // ourselves so credentials are always applied.
    let parsed: URL;
    try {
      parsed = new URL(cloudinaryUrl);
    } catch {
      throw new ServiceUnavailableException(
        'CLOUDINARY_URL tiene un formato inválido.',
      );
    }
    if (parsed.protocol !== 'cloudinary:') {
      throw new ServiceUnavailableException(
        "CLOUDINARY_URL debe empezar por 'cloudinary://'.",
      );
    }

    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });
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
            folder: 'agendya-covers',
            transformation: [{ width: 1600, height: 600, crop: 'limit' }],
          }
        : {
            folder: 'agendya-logos',
            transformation: [{ width: 400, height: 400, crop: 'limit' }],
          };

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            return reject(
              new BadRequestException(
                `No se pudo subir la imagen: ${error.message}`,
              ),
            );
          }
          if (!result) {
            return reject(
              new ServiceUnavailableException(
                'Cloudinary no devolvió un resultado.',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
