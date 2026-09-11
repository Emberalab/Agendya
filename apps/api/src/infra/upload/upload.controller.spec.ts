import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

function fileWith(
  overrides: Partial<Express.Multer.File>,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'upload',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from(''),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
    ...overrides,
  };
}

describe('UploadController', () => {
  let uploadService: { uploadImage: jest.Mock };
  let controller: UploadController;

  beforeEach(() => {
    uploadService = {
      uploadImage: jest.fn().mockResolvedValue('https://cdn.example/img.png'),
    };
    controller = new UploadController(
      uploadService as unknown as UploadService,
    );
  });

  it('accepts an allowed raster mimetype', async () => {
    await expect(
      controller.uploadImage(fileWith({ mimetype: 'image/png' }), 'logo'),
    ).resolves.toEqual({ url: 'https://cdn.example/img.png' });
  });

  // Regression test: the check used to be `mimetype.startsWith('image/')`,
  // which admits `image/svg+xml` — an SVG can carry a <script> or
  // on-event-handler payload, unlike the raster formats this endpoint is
  // meant for. The mimetype here is entirely client-supplied (multer reads
  // it straight from the multipart part), so it must be checked against an
  // allowlist, not a prefix.
  it('rejects image/svg+xml even though it starts with "image/"', async () => {
    await expect(
      controller.uploadImage(fileWith({ mimetype: 'image/svg+xml' }), 'logo'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadService.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects a non-image mimetype', async () => {
    await expect(
      controller.uploadImage(fileWith({ mimetype: 'application/pdf' }), 'logo'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
