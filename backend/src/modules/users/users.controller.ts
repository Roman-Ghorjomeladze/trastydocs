import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { z } from 'zod';
import { UsersService } from './users.service.js';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

/** SECURITY: Whitelist only safe fields for user self-update */
const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
});
type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateUserSchema)) data: UpdateUserDto,
  ) {
    // SECURITY: Users can only update their own profile
    if (id !== user.id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    // SECURITY: Users can only deactivate their own account
    if (id !== user.id) {
      throw new ForbiddenException('You can only deactivate your own account');
    }
    return this.usersService.remove(id);
  }
}
