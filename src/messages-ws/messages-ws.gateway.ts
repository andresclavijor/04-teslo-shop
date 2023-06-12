import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { messageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './../auth/interfaces/jwtPayload.interface';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;
  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.headers.token as string;
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnetedClients(),
    );
  }

  handleDisconnect(client: Socket) {
    // console.log('cliente Desconectado: ', client.id);
    this.messagesWsService.removeClient(client.id);
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnetedClients(),
    );
    console.log(`conectados: ${this.messagesWsService.getConnetedClients()}`);
  }

  //Message from client
  @SubscribeMessage('message-from-client')
  async onMessageFromClient(client: Socket, payload: messageDto) {
    //!Emite al cliente
    // client.emit('message-from-server', {
    //   fullName: 'soy yo',
    //   message: payload.message || 'No message',
    // });

    //!emite a todos menos al cliente
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'soy yo',
    //   message: payload.message || 'No message',
    // });

    //Emite a todos
    console.log(payload);
    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || 'No message',
    });
  }
}
