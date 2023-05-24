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
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as uuidValidate } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);

      return product;
    } catch (error) {
      this.HandleDbExeptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { offset = 0, limit = 10 } = paginationDto;

    return this.productRepository.find({
      take: limit,
      skip: offset,
      // TODO: relaciones
    });
  }

  async findOne(term: string) {
    let product: Product;
    if (uuidValidate(term)) {
      product = await this.productRepository.findOne({ where: { id: term } });
    } else {
      product = await this.productRepository
        .createQueryBuilder()
        .where(`CONCAT_WS(' ', LOWER(title), slug) LIKE :term`, {
          term: `%${term.toLowerCase()}%`,
        })
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with id ${term} not found`);
    }
    return product;
  }

  async findBytermn(term: string) {
    let product: Product[];
    product = await this.productRepository
      .createQueryBuilder()
      // .where(`CONCAT_WS(' ', LOWER(title),LOWER(description),stock, unnest(sizes) AS size,LOWER(gender),price, slug) LIKE :term`, { term: `%${term.toLowerCase()}%` }).getMany()
      .where(
        `(
          LOWER(title) LIKE :term
          OR LOWER(description) LIKE :term
          OR CAST(stock AS text) LIKE :term
          OR LOWER(gender) LIKE :term
          OR CAST(price AS text) LIKE :term
          OR CAST(slug AS text) LIKE :term
          OR ARRAY_TO_STRING(sizes, ' ') LIKE :term
    )`,
        { term: `%${term.toLowerCase()}%` },
      )
      .getMany();
    if (!product || product.length == 0) {
      throw new NotFoundException(`Not found data with term: ${term}`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    try {
      await this.productRepository.save(product);
    } catch (error) {
      this.HandleDbExeptions(error);
    }
    return product;
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
