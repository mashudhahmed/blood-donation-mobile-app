import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List live chat conversations with donors from Firestore' })
  async getConversations(@Req() req: any) {
    return this.chatService.getConversations(req.user);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a specific conversation' })
  async getMessages(@Req() req: any, @Param('id') id: string) {
    return this.chatService.getMessages(id, req.user);
  }

  @Post('conversations/:id/send')
  @ApiOperation({ summary: 'Send a message in a conversation to mobile user via Firestore' })
  async sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    return this.chatService.sendMessage(id, req.user, body.text);
  }
}
