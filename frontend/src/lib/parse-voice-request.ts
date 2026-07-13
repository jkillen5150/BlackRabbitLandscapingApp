export interface ParsedVoiceRequest {
  name?: string;
  phone?: string;
  address?: string;
  serviceType?: string;
  urgency?: string;
  details: string;
  filledFields: string[];
}

const URGENCY_KEYWORDS: { pattern: RegExp; value: string; label: string }[] = [
  { pattern: /\b(today|asap|right away|emergency|urgent|immediately|now)\b/i, value: 'Today', label: 'urgency' },
  { pattern: /\b(this week)\b/i, value: 'This Week', label: 'urgency' },
  { pattern: /\b(next week)\b/i, value: 'Next Week', label: 'urgency' },
  { pattern: /\b(just a quote|quote only|estimate only|ballpark)\b/i, value: 'Quote', label: 'urgency' },
];

const SERVICE_KEYWORDS: Record<string, RegExp[]> = {
  'Lawn Care': [/\b(lawn|mow|mowing|grass|yard|edging|edge the)\b/i],
  Landscaping: [/\b(landscap|mulch|planting|bush|shrub|garden|flower bed)\b/i],
  'Window Washing': [/\b(window wash|windows washed|clean (?:my )?windows)\b/i],
  Handyman: [/\b(handyman|repair|fix something|install|handy work)\b/i],
  'Pressure Washing': [/\b(pressure wash|power wash|driveway wash)\b/i],
  'Gutter Cleaning': [/\b(gutter|gutters)\b/i],
};

const PHONE_PATTERN =
  /(?:phone(?: number)?|number|call me(?: at)?|reach me(?: at)?|text me(?: at)?)\s*(?:is\s+)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})|(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i;

const NAME_PATTERN =
  /(?:my name is|this is|i'm|i am|name is|name's)\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i;

const ADDRESS_INTRO =
  /(?:at|on|address is|located at|live at|living at|my address is|property (?:is )?at|house (?:is )?at|place is)\s+(.+?)(?=\s+(?:and|i need|i want|please|my name|phone|call|number)\b|[.]|$)/i;

const STREET_SUFFIX =
  '(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|way|circle|cir|place|pl|highway|hwy)';

const STREET_ADDRESS = new RegExp(
  `\\b(\\d{1,6}\\s+(?:[NSEW]\\s+)?[\\w'.-]+(?:\\s+[\\w'.-]+){0,4}\\s*${STREET_SUFFIX}\\b(?:\\s*(?:,?\\s*(?:apt|unit|#)\\s*[\\w\\d-]+)?)?(?:\\s*,?\\s*[\\w\\s'-]+)?(?:\\s*,?\\s*(?:WA|Washington)\\b)?)`,
  'i'
);

const LOCAL_CITIES = /\b(Yelm|Olympia|Tacoma|Lacey|Rainier|Tenino|Roy|McKenna)\b/i;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

function titleCaseAddress(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (['st', 'ave', 'rd', 'dr', 'ln', 'blvd', 'ct', 'wa'].includes(lower)) {
        return lower === 'wa' ? 'WA' : lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function inferAddress(text: string): { address?: string; remainder: string } {
  const intro = text.match(ADDRESS_INTRO);
  if (intro) {
    const address = titleCaseAddress(intro[1].trim().replace(/\s+/g, ' '));
    return {
      address: finalizeAddress(address),
      remainder: text.replace(intro[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  const street = text.match(STREET_ADDRESS);
  if (street) {
    const address = titleCaseAddress(street[1].trim().replace(/\s+/g, ' '));
    return {
      address: finalizeAddress(address),
      remainder: text.replace(street[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  const cityOnly = text.match(
    /\b(?:in|near|around)\s+(Yelm|Olympia|Tacoma|Lacey|Rainier|Tenino)(?:\s*,?\s*(?:WA|Washington))?\b/i
  );
  if (cityOnly) {
    const city = cityOnly[1];
    const hasState = /wa|washington/i.test(cityOnly[0]);
    const address = hasState ? `${city}, WA` : `${city}, WA`;
    return {
      address,
      remainder: text.replace(cityOnly[0], ' ').replace(/\s+/g, ' ').trim(),
    };
  }

  return { remainder: text };
}

function finalizeAddress(address: string): string {
  if (/,\s*(WA|Washington)\b/i.test(address) || LOCAL_CITIES.test(address)) {
    return address.replace(/\bWashington\b/i, 'WA');
  }
  return `${address}, Yelm, WA`;
}

function inferServiceType(transcript: string, serviceTypes: string[]): string | undefined {
  for (const type of serviceTypes) {
    const patterns = SERVICE_KEYWORDS[type];
    if (patterns?.some((pattern) => pattern.test(transcript))) return type;
  }
  for (const type of serviceTypes) {
    if (new RegExp(`\\b${type.replace(/\s+/g, '\\s+')}\\b`, 'i').test(transcript)) return type;
  }
  return undefined;
}

function inferUrgency(transcript: string): string | undefined {
  for (const { pattern, value } of URGENCY_KEYWORDS) {
    if (pattern.test(transcript)) return value;
  }
  return undefined;
}

export function parseVoiceRequest(transcript: string, serviceTypes: string[]): ParsedVoiceRequest {
  let text = transcript.trim();
  const filledFields: string[] = [];
  const result: ParsedVoiceRequest = { details: text, filledFields };

  const phoneMatch = text.match(PHONE_PATTERN);
  if (phoneMatch) {
    const raw = phoneMatch[1] || phoneMatch[2];
    result.phone = normalizePhone(raw);
    filledFields.push('phone');
    text = text.replace(phoneMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  const nameMatch = text.match(NAME_PATTERN);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
    filledFields.push('name');
    text = text.replace(nameMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  const { address, remainder } = inferAddress(text);
  if (address) {
    result.address = address;
    filledFields.push('address');
    text = remainder;
  }

  const serviceType = inferServiceType(transcript, serviceTypes);
  if (serviceType) {
    result.serviceType = serviceType;
    filledFields.push('service');
  }

  const urgency = inferUrgency(transcript);
  if (urgency) {
    result.urgency = urgency;
    filledFields.push('urgency');
  }

  result.details = text || transcript;
  return result;
}