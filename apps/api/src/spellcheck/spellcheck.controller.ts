import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuerySpellcheckReportDto } from './dto/query-spellcheck-report.dto';
import { SpellcheckService } from './spellcheck.service';

@ApiTags('spellcheck')
@Controller('spellcheck')
export class SpellcheckController {
  constructor(private readonly spellcheckService: SpellcheckService) {}

  @Get('report')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Scan a batch of songs for spelling typos in lyrics (LanguageTool)',
  })
  getReport(@Query() query: QuerySpellcheckReportDto) {
    return this.spellcheckService.scanBatch(query);
  }
}