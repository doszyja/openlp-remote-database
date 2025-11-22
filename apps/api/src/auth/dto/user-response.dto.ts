export interface UserResponseDto {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string | null;
  avatar?: string | null;
  discordRoles?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

