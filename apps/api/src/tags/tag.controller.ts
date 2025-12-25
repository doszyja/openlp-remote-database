import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EditPermissionGuard } from '../auth/guards/edit-permission.guard';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: 'Filter by parent ID (null for root tags)',
  })
  @ApiResponse({ status: 200, description: 'List of tags' })
  findAll(@Query('parentId') parentId?: string) {
    const parsedParentId =
      parentId === 'null' || parentId === '' ? null : parentId;
    return this.tagService.findAll(parsedParentId);
  }

  @Get('hierarchy')
  @Public()
  @ApiOperation({ summary: 'Get tags as hierarchy tree' })
  @ApiResponse({ status: 200, description: 'Hierarchical tag tree' })
  getHierarchy() {
    return this.tagService.getHierarchy();
  }

  @Get('suggest')
  @Public()
  @ApiOperation({ summary: 'Suggest tags based on song content' })
  @ApiQuery({ name: 'title', required: true })
  @ApiQuery({ name: 'lyrics', required: false })
  @ApiResponse({ status: 200, description: 'Suggested tags' })
  suggestTags(@Query('title') title: string, @Query('lyrics') lyrics?: string) {
    return this.tagService.suggestTags(title, lyrics || '');
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific tag' })
  @ApiResponse({ status: 200, description: 'Tag data' })
  findOne(@Param('id') id: string) {
    return this.tagService.findOne(id);
  }

  @Post()
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  create(@Body() tagData: any) {
    return this.tagService.create(tagData);
  }

  @Patch(':id')
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiResponse({ status: 200, description: 'Tag updated' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.tagService.update(id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(EditPermissionGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 204, description: 'Tag deleted' })
  remove(@Param('id') id: string) {
    return this.tagService.delete(id);
  }
}
