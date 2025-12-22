export interface UserResponseDto {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordRoles?: string[] | null;
  hasEditPermission?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
