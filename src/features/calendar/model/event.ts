interface Event {
  uid: string;
  dtstamp: Date;
  dtstart: Date;
  dtend: Date;
  summary: string;
  description?: string;
  location?: string;
  rrule?: string;
  exdate?: Date[];
  attendees?: { email: string; name?: string }[];
  organizer: { email: string; name?: string };
}

export default Event;