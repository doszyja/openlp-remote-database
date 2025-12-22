/**
 * Service Plan types for planning church services
 */

export interface ServicePlanItem {
  id: string;
  songId: string;
  songTitle: string;
  order: number; // Order in the service plan
  notes?: string; // Optional notes for this item
  isActive?: boolean; // Whether this song is currently active/presented
  activeVerseIndex?: number; // Currently active verse index for live view
}

export interface ServicePlan {
  id: string;
  name: string; // Name of the service plan (e.g., "Niedziela 15.01.2024")
  date?: string; // Date of the service (ISO format)
  items: ServicePlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePlanDto {
  name: string;
  date?: string;
  items?: Omit<ServicePlanItem, 'id'>[];
}

export interface UpdateServicePlanDto {
  name?: string;
  date?: string;
  items?: ServicePlanItem[];
}

export interface AddSongToPlanDto {
  songId: string;
  order?: number;
  notes?: string;
}

export interface SetActiveSongDto {
  itemId: string;
  isActive: boolean;
}

export interface SetActiveVerseDto {
  itemId: string;
  verseIndex: number;
}
