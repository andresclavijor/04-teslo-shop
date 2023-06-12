import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from 'src/auth/entities/user.entity';
import { Repository } from 'typeorm';

interface ConnectedClients {
  [id: string]: { socket: Socket; user: User };
}

@Injectable()
export class MessagesWsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  private connectedClients: ConnectedClients = {};

  async registerClient(client: Socket, userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new Error('User Not Found');
    if (!user.isActivate) throw new Error('User Not Active');

    this.checkUserConnection(user);
    this.connectedClients[client.id] = { socket: client, user: user };
  }

  removeClient(clientId: string) {
    delete this.connectedClients[clientId];
  }

  getConnetedClients(): string[] {
    return Object.keys(this.connectedClients);
  }

  getUserFullName(socketId: string) {
    return this.connectedClients[socketId].user.fullName;
  }

  private checkUserConnection(user: User){
    for (const key in this.connectedClients) {
      let connecteClient = this.connectedClients[key];
      if(connecteClient.user.id == user.id){
        connecteClient.socket.disconnect();
        break
      }
    }
  }


}
