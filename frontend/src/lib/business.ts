/**
 * Black Rabbit house brand — contact + routing labels.
 */

export const OWNER = {
  brand: 'Black Rabbit Services',
  phoneDisplay: '(407) 951-1663',
  phoneDigits: '4079511663',
  phoneE164: '+14079511663',
  areas: 'Yelm, Rainier, Olympia, and nearby South Sound',
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
  return `${OWNER_SMS}?body=${encodeURIComponent(body)}`;
}
