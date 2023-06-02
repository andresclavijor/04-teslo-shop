import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
@Injectable()
export class SeedService {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async deleteTables() {
    await this.productsService.deleteAllProducts();

    const queryBuilder = this.userRepository.createQueryBuilder();
    await queryBuilder.delete().where({}).execute();
  }

  private async insertUser() {
    const seedUsers = initialData.users;

    const users: User[] = seedUsers.map((user) => {
      user.password = bcrypt.hashSync(user.password, 10);
      return this.userRepository.create(user);
    });

    const dbUsers = await this.userRepository.save(users);
    return dbUsers[0];
  }

  private async insertNewProducts(user) {
    const products = initialData.products;

    const insertPromises = products.map((product) => {
      return this.productsService.create(product, user);
    });

    await Promise.all(insertPromises);

    return true;
  }

  async runSeed() {
    await this.deleteTables();
    const adminUser = await this.insertUser();

    await this.insertNewProducts(adminUser);

    return 'SEED EXECUTED';
  }
}
