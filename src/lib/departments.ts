import { Building2, Network, UtensilsCrossed, Speaker, Camera, Car, type LucideIcon } from "lucide-react";

export const DEPARTMENTS = [
  "facilities",
  "it_network",
  "kitchen",
  "audio_video",
  "photo_video",
  "parking",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

type DeptMeta = {
  id: Department;
  label: string;
  short: string;
  blurb: string;
  icon: LucideIcon;
  /** Literal Tailwind classes so the scanner picks them up. */
  text: string;
  bg: string;
  softBg: string;
  border: string;
  fill: string;
  stroke: string;
};

export const DEPT: Record<Department, DeptMeta> = {
  facilities: {
    id: "facilities",
    label: "Facilities",
    short: "Facilities",
    blurb: "AC & heating for your rooms",
    icon: Building2,
    text: "text-dept-facilities",
    bg: "bg-dept-facilities",
    softBg: "bg-dept-facilities/15",
    border: "border-dept-facilities",
    fill: "fill-dept-facilities",
    stroke: "stroke-dept-facilities",
  },
  it_network: {
    id: "it_network",
    label: "IT / Network",
    short: "IT",
    blurb: "Door access & event Wi-Fi",
    icon: Network,
    text: "text-dept-it-network",
    bg: "bg-dept-it-network",
    softBg: "bg-dept-it-network/15",
    border: "border-dept-it-network",
    fill: "fill-dept-it-network",
    stroke: "stroke-dept-it-network",
  },
  kitchen: {
    id: "kitchen",
    label: "Kitchen",
    short: "Kitchen",
    blurb: "Meals, headcount & allergies",
    icon: UtensilsCrossed,
    text: "text-dept-kitchen",
    bg: "bg-dept-kitchen",
    softBg: "bg-dept-kitchen/15",
    border: "border-dept-kitchen",
    fill: "fill-dept-kitchen",
    stroke: "stroke-dept-kitchen",
  },
  audio_video: {
    id: "audio_video",
    label: "Audio / Video",
    short: "AV",
    blurb: "Mics, screens, lighting",
    icon: Speaker,
    text: "text-dept-audio-video",
    bg: "bg-dept-audio-video",
    softBg: "bg-dept-audio-video/15",
    border: "border-dept-audio-video",
    fill: "fill-dept-audio-video",
    stroke: "stroke-dept-audio-video",
  },
  photo_video: {
    id: "photo_video",
    label: "Photo / Video",
    short: "Photo",
    blurb: "Design studio, photo & video",
    icon: Camera,
    text: "text-dept-photo-video",
    bg: "bg-dept-photo-video",
    softBg: "bg-dept-photo-video/15",
    border: "border-dept-photo-video",
    fill: "fill-dept-photo-video",
    stroke: "stroke-dept-photo-video",
  },
  parking: {
    id: "parking",
    label: "Parking",
    short: "Parking",
    blurb: "Lots, reserved spots & attendants",
    icon: Car,
    text: "text-dept-parking",
    bg: "bg-dept-parking",
    softBg: "bg-dept-parking/15",
    border: "border-dept-parking",
    fill: "fill-dept-parking",
    stroke: "stroke-dept-parking",
  },
};

export const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
] as const;

export type RequestStatus = (typeof STATUS_OPTIONS)[number]["value"];

export function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

/** Staff accounts. Logins use a name, not a real email address. */
export const STAFF_ACCOUNTS = [
  { slug: "master", label: "Master", sub: "Management · sees everything", department: null },
  { slug: "facilities", label: "Facilities", sub: "Department lead", department: "facilities" },
  { slug: "it-network", label: "IT / Network", sub: "Department lead", department: "it_network" },
  { slug: "kitchen", label: "Kitchen", sub: "Department lead", department: "kitchen" },
  { slug: "audio-video", label: "Audio / Video", sub: "Department lead", department: "audio_video" },
  { slug: "photo-video", label: "Photo / Video", sub: "Department lead", department: "photo_video" },
  { slug: "parking", label: "Parking", sub: "Department lead", department: "parking" },
] as const satisfies ReadonlyArray<{ slug: string; label: string; sub: string; department: Department | null }>;

export const STAFF_EMAIL_DOMAIN = "staff.bapshouston.app";
export const accountEmail = (slug: string) => `${slug}@${STAFF_EMAIL_DOMAIN}`;
