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
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen.');
    }
    if (file.size > MAX_BYTES[variant]) {
      const mb = MAX_BYTES[variant] / (1024 * 1024);
      throw new BadRequestException(`La imagen no puede superar ${mb}MB.`);
    }

    const url = await this.uploadService.uploadImage(file, variant);
    return { url };
  }
}
