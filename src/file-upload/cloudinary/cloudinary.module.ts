import { Module } from '@nestjs/common';
import { CLOUDINARY_PROVIDER } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CLOUDINARY_PROVIDER, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
