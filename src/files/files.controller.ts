import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/file-filter';
import { diskStorage } from 'multer';
import { fileNamer } from './helpers/file-namer';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configServie: ConfigService,
  ) {}

  @Get('product/:imageName')
  findFileProduct(@Res() res: Response, @Param('imageName') imageName: string) {
    const path = this.filesService.getStaticProductImage(imageName);
    res.sendFile(path);
  }

  @Post('product')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: fileFilter,
      storage: diskStorage({
        destination: './static/products',
        filename: fileNamer,
      }),
    }),
  )
  uploadFile(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    console.log(file);
    if (!file) {
      throw new BadRequestException('Make sure that the file is an image');
    }
    const secureUrl = `${this.configServie.get('HOST_API')}/files/product/${file.filename}`;

    return { secureUrl };
  }

  @Post('multiple')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: fileFilter,
      storage: diskStorage({
        destination: './static/products',
        filename: fileNamer,
      }),
    }),
  )
  uploadFiles(
    @UploadedFiles()
    files: Array<Express.Multer.File>,
  ) {
    if (!files || files.length == 0) {
      throw new BadRequestException('Make sure that the files is an image');
    }
    return { fileName: files.map((file) => `${this.configServie.get('HOST_API')}/files/product/${file.filename}`) };
  }
}
