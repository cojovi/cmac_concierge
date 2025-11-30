
// Types for Google API global objects
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface MeetingConstraints {
  durationMinutes: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'any';
  excludedDays?: string[];
  context?: string; // Original prompt
}

export interface TimeSlot {
  id: string;
  start: Date;
  end: Date;
  reason: string; // Generated explanation
  score: number; // For ranking
}

export interface MeetingDetails {
  title: string;
  description: string;
  location: string;
}

export enum AppState {
  LOGIN,
  DASHBOARD,
  SELECT_COWORKER,
  CONSTRAINTS,
  LOADING_SLOTS,
  SUGGESTIONS,
  CONFIRMATION,
  SUCCESS,
  ERROR
}

export enum ConciergeMood {
  IDLE,
  LISTENING,
  THINKING,
  POINTING,
  CELEBRATING,
  CONFUSED
}
