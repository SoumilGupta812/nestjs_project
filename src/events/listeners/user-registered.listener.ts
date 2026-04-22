import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UserRegisteredEvent } from '../user-events.service';

@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);
  @OnEvent('user.registered')
  handleUserRegisteredEvent(event: UserRegisteredEvent): void {
    const { user, timestamp } = event;
    this.logger.log(
      `Welcome, ${user.name}! You registered at ${timestamp.toISOString()}`,
    );
  }
}
