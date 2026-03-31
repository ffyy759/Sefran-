export interface Message {
  role: "user" | "model";
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export interface UserProfile {
  name: string;
  location: string;
  class: string;
  target: string;
  projects: string[];
}
