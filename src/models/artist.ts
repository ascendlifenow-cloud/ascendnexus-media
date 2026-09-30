export type ArtistStatus = "active" | "archived";

export interface ArtistExternalLinks {
  spotify?: string;
  appleMusic?: string;
  youtube?: string;
  suno?: string;
  soundCloud?: string;
  tikTok?: string;
  instagram?: string;
  website?: string;
}

export interface ArtistPublicProfile {
  artistId: string;
  name: string;
  slug: string;
  displayName: string;
  bio: string;
  profileImage: string;
  status: ArtistStatus;
  sortOrder: number;
  musicStyle: string;
  featured: boolean;
  externalLinks?: ArtistExternalLinks;
}
