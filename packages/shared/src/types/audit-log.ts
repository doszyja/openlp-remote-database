export enum AuditLogAction {
  LOGIN = 'LOGIN',
  SONG_EDIT = 'SONG_EDIT',
  SONG_EDIT_OPENLP = 'SONG_EDIT_OPENLP',
  SONG_CREATE = 'SONG_CREATE',
  SONG_CREATE_OPENLP = 'SONG_CREATE_OPENLP',
  SONG_DELETE = 'SONG_DELETE',
  SONG_RESTORE_VERSION = 'SONG_RESTORE_VERSION',
  ZIP_EXPORT = 'ZIP_EXPORT',
}

export interface AuditLog {
  _id: string;
  action: AuditLogAction;
  userId: string;
  username: string;
  discordId?: string;
  /** Discord avatar hash captured when the action was logged. */
  avatar?: string | null;
  songId?: string;
  songTitle?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}
