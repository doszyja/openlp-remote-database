import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditLogAction } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(
    action: AuditLogAction,
    userId: string,
    username: string,
    options?: {
      discordId?: string;
      songId?: string;
      songTitle?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<AuditLogDocument> {
    const auditLog = new this.auditLogModel({
      action,
      userId,
      username,
      discordId: options?.discordId,
      songId: options?.songId,
      songTitle: options?.songTitle,
      metadata: options?.metadata || {},
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    return auditLog.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    filters?: {
      action?: AuditLogAction;
      username?: string;
      songId?: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {
    const skip = (page - 1) * limit;
    
    // Build query filter
    const queryFilter: any = {};
    
    if (filters?.action) {
      queryFilter.action = filters.action;
    }
    
    if (filters?.username) {
      queryFilter.username = { $regex: filters.username, $options: 'i' };
    }
    
    if (filters?.songId) {
      queryFilter.songId = filters.songId;
    }
    
    if (filters?.fromDate || filters?.toDate) {
      queryFilter.createdAt = {};
      if (filters.fromDate) {
        queryFilter.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        // Add one day to include the entire day
        const endDate = new Date(filters.toDate);
        endDate.setHours(23, 59, 59, 999);
        queryFilter.createdAt.$lte = endDate;
      }
    }
    
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(queryFilter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

