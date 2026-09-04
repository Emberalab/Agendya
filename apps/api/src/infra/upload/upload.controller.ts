import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

// The web app downscales images before upload; these are just abuse guards.
const MAX_BYTES: Record<'logo' | 'cover', number> = {
  logo: 6 * 1024 * 1024,
  cover: 12 * 1024 * 1024,
};
const HARD_LIMIT_BYTES = 15 * 1024 * 1024;

// Raster formats only. In particular, SVG is excluded even though it starts
// with "image/": an SVG can embed <script>/event-handler markup, and this
// check is the only gate before the file reaches Cloudinary — the client
// -supplied mimetype it's read from isn't verified against the actual file
// contents, so it must not be trusted to admit a format that can carry
// script.
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: HARD_LIMIT_BYTES } }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    const variant: 'logo' | 'cover' = type === 'cover' ? 'cover' : 'logo';

    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'El archivo debe ser una imagen PNG, JPEG, WEBP o GIF.',
      );
    }
    if (file.size > MAX_BYTES[variant]) {
      const mb = MAX_BYTES[variant] / (1024 * 1024);
      throw new BadRequestException(`La imagen no puede superar ${mb}MB.`);
    }

    const url = await this.uploadService.uploadImage(file, variant);
    return { url };
  }
}
