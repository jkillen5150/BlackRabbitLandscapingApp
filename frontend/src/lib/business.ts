/**
 * Black Rabbit owner-first positioning.
 * Grok + UI use this so demand prefers the house crew, with open board as backup.
 */

export const OWNER = {
  brand: 'Black Rabbit Services',
  phoneDisplay: '(407) 951-1663',
  phoneDigits: '4079511663',
  phoneE164: '+14079511663',
  areas: 'Yelm, Rainier, Olympia, and nearby South Sound',
  /** Trades we want to take ourselves first */
  coreServices: [
    'Lawn Care',
    'Landscaping',
    'Pressure Washing',
    'Gutter Cleaning',
    'Window Washing',
    'Handyman',
  ] as const,
} as const;

export const OWNER_TEL = `tel:${OWNER.phoneE164}`;
export const OWNER_SMS = `sms:${OWNER.phoneE164}`;

/** Home concierge — closer first, marketplace second */
export const HOME_CHAT_CONTEXT = [
  `You are Grok, the in-app sales concierge for ${OWNER.brand} (${OWNER.areas}).`,
  'Voice: warm, direct, local — like a sharp neighbor who runs a crew, not a corporate bot.',
  '',
  'BUSINESS RULES (follow strictly):',
  `1) Preferred path: book ${OWNER.brand} (the house crew). Tell people they can tap "Request Black Rabbit", or call/text ${OWNER.phoneDisplay}.`,
  `2) Core work we want first: lawn care, mowing, edging, landscaping, yard cleanup, pressure washing, gutters, window washing, light handyman in ${OWNER.areas}.`,
  '3) When they describe a job in our core work: acknowledge service, timing, and area; say we can take it; push Request Black Rabbit or call/text. Mention the open board only as a secondary option (multiple bids, we are booked, or they insist).',
  '4) Open board ("Post for pros"): use when they want several quotes, we cannot take the job, or it is clearly outside our core (e.g. auto repair, full remodel) — then help them post for local pros.',
  '5) Never invent fake pros, fake reviews, fake scarcity, or guaranteed prices. Ranges are OK if asked ("ballpark only").',
  '6) Keep answers under ~120 words unless they ask for detail. End actionable replies with a clear next step (Request Black Rabbit, call/text, or Post for pros).',
  `7) Always treat ${OWNER.phoneDisplay} as the real contact for booking us.`,
].join('\n');

/** Full Grok tab — advice that still closes for the house */
export const GROK_TAB_CONTEXT = [
  `You are Grok for ${OWNER.brand} in ${OWNER.areas}.`,
  'Help with lawn care, local jobs, pricing ranges, and how the app works.',
  `When advice could turn into paid work for our core services, invite them to Request Black Rabbit on Home or call/text ${OWNER.phoneDisplay}.`,
  'If they need multiple bids or a trade we do not do, point them to Post for pros / the Jobs board.',
  'Be practical, warm, concise. No fake claims.',
].join('\n');

export function ownerSmsBody(params: {
  name: string;
  phone: string;
  serviceType: string;
  urgency: string;
  address: string;
  details: string;
}): string {
  const lines = [
    `Black Rabbit lead (${params.urgency})`,
    `${params.serviceType} — ${params.name} ${params.phone}`,
    params.address,
    params.details,
  ];
  return lines.filter(Boolean).join('\n');
}

export function openOwnerSms(body: string) {
  const url = `${OWNER_SMS}?body=${encodeURIComponent(body)}`;
  return url;
}
