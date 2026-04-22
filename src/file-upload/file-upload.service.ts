import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './entities/file.entity';
import { Repository } from 'typeorm';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(File) private readonly fileRepository: Repository<File>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    description: string | undefined,
    user: User,
  ): Promise<File> {
    const uploadedFile = await this.cloudinaryService.uploadFile(file);
    const newFile = this.fileRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadedFile?.secure_url,
      publicId: uploadedFile?.public_id,
      uploader: user,
      description,
    });
    return this.fileRepository.save(newFile);
  }

  async findAll(): Promise<File[]> {
    return this.fileRepository.find({
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    const fileToRemove = await this.fileRepository.findOne({
      where: { id },
    });

    if (!fileToRemove)
      throw new NotFoundException('File with id ' + id + ' not found');

    await this.cloudinaryService.deleteFile(fileToRemove.publicId);
    await this.fileRepository.remove(fileToRemove);
  }
}
