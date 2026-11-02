import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Pick a time");
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const qty = z.coerce.number({ invalid_type_error: "Enter a number" }).int().min(1, "At least 1").max(9999);
const yesNo = z.boolean({ invalid_type_error: "Choose yes or no", required_error: "Choose yes or no" });

export const MEALS = ["breakfast", "lunch", "dinner"] as const;
export const MEAL_LABEL: Record<(typeof MEALS)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const AV_LOCATIONS = [
  "Narayan Sabha Hall",
  "Annex A",
  "Annex B",
  "Gym",
  "Old Sabha Hall",
  "BKY Wing",
] as const;

export const AV_AUDIO = [
  { id: "mics", label: "Mics", qty: true },
  { id: "fender", label: "Fender system", qty: false },
  { id: "lapels", label: "Lapels", qty: true },
  { id: "soundboard_operator", label: "Sound board operator", qty: false },
] as const;
export const AV_VIDEO = [
  { id: "equipment_operators", label: "Equipment operators", qty: false },
  { id: "back_screen", label: "Back screen", qty: false },
  { id: "side_screen", label: "Side screen", qty: false },
  { id: "rolling_tvs", label: "Rolling TVs", qty: true },
] as const;
export const AV_MISC = [
  { id: "lighting", label: "Lighting system", qty: false },
  { id: "power_strip", label: "Power strip", qty: false },
  { id: "extension_cable", label: "Extension cable", qty: false },
] as const;
export const AV_ALL = [...AV_AUDIO, ...AV_VIDEO, ...AV_MISC];

export const DESIGN_ITEMS = [
  { id: "graphics", label: "Graphics" },
  { id: "prints", label: "Prints" },
  { id: "backdrops", label: "Backdrops" },
  { id: "templates", label: "Templates" },
] as const;
export const MEDIA_ITEMS = [
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
] as const;

export const PARKING_NEEDS = [
  { id: "reserved_vip", label: "Reserved / VIP spots" },
  { id: "attendants", label: "Parking attendants" },
  { id: "bus_shuttle", label: "Bus or shuttle parking" },
  { id: "accessible", label: "Extra accessible parking" },
] as const;

const endAfterStart = <T extends { startDate: string; endDate: string }>(v: T) => v.endDate >= v.startDate;

const roomsAndSchedule = {
  rooms: z.array(z.string().min(1)).min(1, "Select at least one room on the map").max(60),
  sharedFrom: z.string().max(80).optional().default(""),
  startDate: date,
  endDate: date,
  startTime: time,
  endTime: time,
};

export const facilitiesSchema = z
  .object(roomsAndSchedule)
  .refine(endAfterStart, { path: ["endDate"], message: "End date can't be before the start date" });

export const itNetworkSchema = z
  .object({
    ...roomsAndSchedule,
    wifiNeeded: yesNo,
    networks: z.array(z.string().trim().max(32)).max(10).default([]),
  })
  .refine(endAfterStart, { path: ["endDate"], message: "End date can't be before the start date" })
  .refine((v) => !v.wifiNeeded || v.networks.filter(Boolean).length > 0, {
    path: ["networks"],
    message: "Add at least one network name",
  });

export const kitchenSchema = z
  .object({
    services: z
      .array(
        z.object({
          date,
          meals: z.array(z.enum(MEALS)).min(1, "Pick at least one meal"),
          people: qty,
        }),
      )
      .min(1, "Add at least one serving day")
      .max(31),
    volunteersEarly: yesNo,
    volunteerArrival: z.string().optional().default(""),
    volunteerCount: z.coerce.number().int().min(0).max(9999).optional().default(0),
    volunteersNeedFood: z.boolean().optional().default(false),
    volunteerMeals: z.array(z.enum(MEALS)).optional().default([]),
    allergies: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (!v.volunteersEarly) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.volunteerArrival))
      ctx.addIssue({ code: "custom", path: ["volunteerArrival"], message: "Pick the arrival date" });
    if (!v.volunteerCount || v.volunteerCount < 1)
      ctx.addIssue({ code: "custom", path: ["volunteerCount"], message: "How many volunteers?" });
    if (v.volunteersNeedFood && v.volunteerMeals.length === 0)
      ctx.addIssue({ code: "custom", path: ["volunteerMeals"], message: "Pick the meals they need" });
  });

const avIds = AV_ALL.map((i) => i.id) as [string, ...string[]];
export const audioVideoSchema = z
  .object({
    locations: z.array(z.enum(AV_LOCATIONS)).min(1, "Pick at least one location"),
    items: z.array(z.enum(avIds)).default([]),
    quantities: z.record(z.string(), z.coerce.number().int().min(0).max(999)).default({}),
  })
  .superRefine((v, ctx) => {
    if (v.items.length === 0)
      ctx.addIssue({ code: "custom", path: ["items"], message: "Pick at least one requirement" });
    for (const item of AV_ALL) {
      if (item.qty && v.items.includes(item.id) && !(v.quantities[item.id] > 0)) {
        ctx.addIssue({ code: "custom", path: ["quantities", item.id], message: "How many?" });
      }
    }
  });

const pvIds = [...DESIGN_ITEMS, ...MEDIA_ITEMS].map((i) => i.id) as [string, ...string[]];
export const photoVideoSchema = z
  .object({
    items: z.record(z.enum(pvIds), z.string().trim().max(2000)).default({}),
    neededBy: z.string().optional().default(""),
  })
  .superRefine((v, ctx) => {
    const keys = Object.keys(v.items);
    if (keys.length === 0) ctx.addIssue({ code: "custom", path: ["items"], message: "Pick at least one option" });
    for (const k of keys) {
      if (!v.items[k as keyof typeof v.items])
        ctx.addIssue({ code: "custom", path: ["items", k], message: "Add details for this item" });
    }
  });

export const parkingSchema = z
  .object({
    date,
    startTime: time,
    endTime: time,
    vehicles: qty,
    needs: z.array(z.enum(PARKING_NEEDS.map((n) => n.id) as [string, ...string[]])).default([]),
  });

export const attachmentSchema = z.object({
  path: z.string().min(1).max(300),
  name: z.string().min(1).max(200),
  size: z.number().int().min(0),
  type: z.string().max(100),
});

const base = {
  comments: optionalText(2000),
  attachments: z.array(attachmentSchema).max(10).default([]),
};

export const requestItemSchema = z.discriminatedUnion("department", [
  z.object({ department: z.literal("facilities"), details: facilitiesSchema, ...base }),
  z.object({ department: z.literal("it_network"), details: itNetworkSchema, ...base }),
  z.object({ department: z.literal("kitchen"), details: kitchenSchema, ...base }),
  z.object({ department: z.literal("audio_video"), details: audioVideoSchema, ...base }),
  z.object({ department: z.literal("photo_video"), details: photoVideoSchema, ...base }),
  z.object({ department: z.literal("parking"), details: parkingSchema, ...base }),
]);

export const submissionSchema = z.object({
  requesterName: z.string().trim().min(1, "Enter your name").max(100),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number")
    .max(30)
    .regex(/^[0-9+()\-.\s]+$/, "Use numbers only"),
  email: z.string().trim().email("Enter a valid email").max(255),
  eventName: z.string().trim().min(2, "Enter the event name").max(150),
  eventDate: date,
  team: z.string().trim().min(1, "Enter your team or ministry").max(120),
  requests: z.array(requestItemSchema).min(1, "Add at least one request").max(12),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type RequestItem = z.infer<typeof requestItemSchema>;
