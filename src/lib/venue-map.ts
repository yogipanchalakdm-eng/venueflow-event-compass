/**
 * Sample floor plan for the venue. Coordinates live in a 1000 x 640 drawing.
 * Swap these rectangles for the real floor plan when it is available — the
 * room ids are what gets saved with each request.
 */
export type Floor = 1 | 2;

export type Room = {
  id: string;
  name: string;
  floor: Floor;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Fixture = { label: string; floor: Floor; x: number; y: number; w: number; h: number };

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 640;

export const ROOMS: Room[] = [
  // Floor 1
  { id: "f1-narayan-sabha", name: "Narayan Sabha Hall", floor: 1, x: 40, y: 40, w: 380, h: 300 },
  { id: "f1-lobby", name: "Main Lobby", floor: 1, x: 440, y: 40, w: 180, h: 140 },
  { id: "f1-annex-a", name: "Annex A", floor: 1, x: 440, y: 200, w: 180, h: 140 },
  { id: "f1-old-sabha", name: "Old Sabha Hall", floor: 1, x: 640, y: 40, w: 320, h: 220 },
  { id: "f1-annex-b", name: "Annex B", floor: 1, x: 640, y: 280, w: 150, h: 140 },
  { id: "f1-main-office", name: "Main Office", floor: 1, x: 810, y: 280, w: 150, h: 140 },
  { id: "f1-gym", name: "Gym", floor: 1, x: 40, y: 360, w: 260, h: 240 },
  { id: "f1-kitchen", name: "Kitchen", floor: 1, x: 320, y: 360, w: 160, h: 120 },
  { id: "f1-dining", name: "Dining Hall", floor: 1, x: 320, y: 500, w: 300, h: 100 },
  { id: "f1-bky-wing", name: "BKY Wing", floor: 1, x: 640, y: 440, w: 320, h: 160 },
  // Floor 2
  { id: "f2-balcony", name: "Sabha Hall Balcony", floor: 2, x: 40, y: 40, w: 380, h: 200 },
  { id: "f2-room-201", name: "Room 201", floor: 2, x: 440, y: 40, w: 120, h: 160 },
  { id: "f2-room-202", name: "Room 202", floor: 2, x: 570, y: 40, w: 120, h: 160 },
  { id: "f2-room-203", name: "Room 203", floor: 2, x: 700, y: 40, w: 120, h: 160 },
  { id: "f2-room-204", name: "Room 204", floor: 2, x: 830, y: 40, w: 130, h: 160 },
  { id: "f2-library", name: "Library", floor: 2, x: 40, y: 280, w: 190, h: 320 },
  { id: "f2-youth-room", name: "Youth Room", floor: 2, x: 250, y: 280, w: 170, h: 320 },
  { id: "f2-room-205", name: "Room 205", floor: 2, x: 440, y: 280, w: 120, h: 160 },
  { id: "f2-room-206", name: "Room 206", floor: 2, x: 570, y: 280, w: 120, h: 160 },
  { id: "f2-room-207", name: "Room 207", floor: 2, x: 700, y: 280, w: 120, h: 160 },
  { id: "f2-room-208", name: "Room 208", floor: 2, x: 830, y: 280, w: 130, h: 160 },
  { id: "f2-conference", name: "Conference Room", floor: 2, x: 440, y: 460, w: 250, h: 140 },
  { id: "f2-admin", name: "Admin Offices", floor: 2, x: 710, y: 460, w: 250, h: 140 },
];

export const FIXTURES: Fixture[] = [
  { label: "Restrooms", floor: 1, x: 500, y: 360, w: 120, h: 120 },
  { label: "Corridor", floor: 2, x: 440, y: 212, w: 520, h: 56 },
  { label: "Stairs", floor: 2, x: 40, y: 252, w: 380, h: 16 },
];

export const ROOM_BY_ID: Record<string, Room> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export function roomName(id: string) {
  return ROOM_BY_ID[id]?.name ?? id;
}

export function roomsOnFloor(ids: string[], floor: Floor) {
  return ids.filter((id) => ROOM_BY_ID[id]?.floor === floor);
}
