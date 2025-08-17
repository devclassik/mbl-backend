import { OnEvent } from '@nestjs/event-emitter';
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: { origin: '*' }, // change to your Next.js frontend URL in production
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    handleConnection(client: Socket) {
        console.log(`🔌 Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`❌ Client disconnected: ${client.id}`);
    }

    // 🔹 Broadcast when a session ends
    @OnEvent('game.session.ended')
    handleSessionEnd(payload: { sessionId: string; winningNumber: number; winners: string[] }) {
        this.server.emit('session-ended', payload);
    }

    // 🔹 Notify individual winners
    @OnEvent('game.player.won')
    handlePlayerWon(payload: { sessionId: string; userId: string; chosenNumber: number }) {
        this.server.to(payload.userId).emit('player-won', payload);
    }

    // 🔹 Broadcast when a player joins
    @OnEvent('game.player.joined')
    handlePlayerJoined(payload: { sessionId: string; userId: string }) {
        this.server.emit('player-joined', payload);
    }

    // 🔹 Broadcast when a player leaves
    @OnEvent('game.player.left')
    handlePlayerLeft(payload: { sessionId: string; userId: string }) {
        this.server.emit('player-left', payload);
    }

    // 🔹 Broadcast when someone is promoted from queue
    @OnEvent('game.player.promoted')
    handlePlayerPromoted(payload: { sessionId: string; userId: string }) {
        this.server.emit('player-promoted', payload);
    }

    @SubscribeMessage('joinGame')
    handleJoinGame(client: Socket, payload: { userId: string }) {
        console.log(`🎮 Player ${payload.userId} joined`);
        this.server.emit('playerJoined', {
            userId: payload.userId,
            timestamp: new Date(),
        });
    }
}
