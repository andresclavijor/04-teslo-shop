import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as uuidValidate } from 'uuid';
import { ProductImage } from './entities/product-images.entity';
import { url } from 'inspector';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly datasoursce: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...produtcDetails } = createProductDto;

      const product = this.productRepository.create({
        ...produtcDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });
      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.HandleDbExeptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { offset = 0, limit = 10 } = paginationDto;
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    return products.map(({ images, ...rest }) => ({
      ...rest,
      images: images.map((image) => image.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;
    if (uuidValidate(term)) {
      product = await this.productRepository.findOne({ where: { id: term } });
    } else {
      product = await this.productRepository
        .createQueryBuilder('prod')
        .where(`CONCAT_WS(' ', LOWER(title), slug) LIKE :term`, {
          term: `%${term.toLowerCase()}%`,
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with id ${term} not found`);
    }
    return product;
  }

  async findOnePlaneImgages(term) {
    const { images, ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map(({ url }) => url),
    };
  }

  async findBytermn(term: string) {
    let product: Product[];
    product = await this.productRepository.query(
      `
        SELECT
        prd.*,
        a.images AS urls
        FROM
            product prd
        LEFT JOIN (
            SELECT
                image."productId",
                ARRAY_AGG(image.url) AS images
            FROM
                product_image AS image
            GROUP BY
                image."productId"
        ) AS a ON prd.id = a."productId"
        WHERE
            LOWER(prd.title) LIKE $1
            OR LOWER(prd.description) LIKE $1
            OR CAST(prd.stock AS TEXT) LIKE $1
            OR LOWER(prd.gender) LIKE $1
            OR CAST(prd.price AS TEXT) LIKE $1
            OR CAST(prd.slug AS TEXT) LIKE $1
            OR LOWER(ARRAY_TO_STRING(prd.sizes, ' ')) LIKE $1
            OR LOWER(ARRAY_TO_STRING(prd.tags, ' ')) LIKE $1
            OR EXISTS (
                SELECT 1
                FROM UNNEST(a.images) AS img
                WHERE LOWER(img) LIKE $1
            );
`,

      [`%${term.toLowerCase()}%`],
    );
    if (!product || product.length == 0) {
      throw new NotFoundException(`Not found data with term: ${term}`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...updateData } = updateProductDto;

    const product = await this.productRepository.preload({ id, ...updateData });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const queryRunner = this.datasoursce.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlaneImgages(id);
      // await this.productRepository.save(product);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.HandleDbExeptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  private HandleDbExeptions(error: any) {
    if ((error.code = '23505')) {
      throw new BadRequestException(`${error.detail}`);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexoected error, check server logs',
    );
  }
}
