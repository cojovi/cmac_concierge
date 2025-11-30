import { User } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Alex (You)',
  email: 'alex@cmacroofing.com',
  avatar: 'https://picsum.photos/seed/alex/100/100',
  role: 'Project Manager'
};

export const MOCK_COWORKERS: User[] = [
  { id: 'u2', name: 'Jason S.', email: 'jason@cmacroofing.com', avatar: 'https://picsum.photos/seed/jason/100/100', role: 'Sales Lead' },
  { id: 'u3', name: 'Cody R.', email: 'cody@cmacroofing.com', avatar: 'https://picsum.photos/seed/cody/100/100', role: 'Operations' },
  { id: 'u4', name: 'Sarah M.', email: 'sarah@cmacroofing.com', avatar: 'https://picsum.photos/seed/sarah/100/100', role: 'Admin' },
  { id: 'u5', name: 'Mike T.', email: 'mike@cmacroofing.com', avatar: 'https://picsum.photos/seed/mike/100/100', role: 'Site Super' },
];

export const MOCK_EXISTING_EVENTS = [
  // Just for simulation logic
  'Meeting with Client',
  'Site Visit',
  'Lunch',
  'Weekly Sync',
  'Material Order Review'
];
