import { MeetingConstraints, TimeSlot } from './types';

// Simulate finding free slots by generating valid random ones based on constraints
export const findMockSlots = (constraints: MeetingConstraints): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  // Ensure we don't schedule in the past if parsed date is weird
  let start = new Date(constraints.startDate);
  if (start.getTime() < Date.now()) {
      start = new Date();
      start.setDate(start.getDate() + 1);
  }

  const duration = constraints.durationMinutes || 60;
  
  // Generate 3-5 options
  const numSlots = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numSlots; i++) {
    const slotDate = new Date(start);
    // Add 0-3 days randomly spread out
    slotDate.setDate(start.getDate() + i + (Math.random() > 0.5 ? 1 : 0));
    
    // Set hours based on preference
    let hour = 9; // Default morning
    if (constraints.timeOfDay === 'afternoon') {
      hour = 13 + Math.floor(Math.random() * 4); // 1pm - 4pm
    } else if (constraints.timeOfDay === 'morning') {
      hour = 9 + Math.floor(Math.random() * 3); // 9am - 11am
    } else {
      hour = 9 + Math.floor(Math.random() * 8); // 9am - 5pm
    }

    slotDate.setHours(hour, 0, 0, 0);

    // Skip weekends for business logic
    if (slotDate.getDay() === 0) { // Sunday
        slotDate.setDate(slotDate.getDate() + 1);
    } else if (slotDate.getDay() === 6) { // Saturday
        slotDate.setDate(slotDate.getDate() + 2);
    }

    const endDate = new Date(slotDate);
    endDate.setMinutes(slotDate.getMinutes() + duration);

    // Reason logic
    const reasons = [
        "Both calendars clear.",
        "Fits your afternoon preference.",
        "Back-to-back with your morning standup.",
        "Earliest available slot.",
        "Optimal time for both timezones.",
        "Avoids your busy Friday block."
    ];

    slots.push({
      id: `slot-${i}`,
      start: slotDate,
      end: endDate,
      reason: reasons[i % reasons.length],
      score: 10 - i
    });
  }

  return slots;
};

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};