import type { InvoiceLanguage } from './invoice-i18n.ts';

// ── English ──────────────────────────────────────────

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function enHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 20) return EN_ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return EN_TENS[t] + (o ? '-' + EN_ONES[o] : '');
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return EN_ONES[h] + ' hundred' + (rest ? ' ' + enHundreds(rest) : '');
}

function numberToWordsEn(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const scales = ['', ' thousand', ' million', ' billion'];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      parts.unshift(enHundreds(chunk) + scales[i]);
    }
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(' ');
}

// ── Russian ──────────────────────────────────────────

const RU_ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const RU_ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
  'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const RU_TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const RU_HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

function ruPlural(n: number, one: string, two: string, five: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs >= 11 && abs <= 19) return five;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return two;
  return five;
}

function ruHundreds(n: number, feminine: boolean): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  if (h > 0) parts.push(RU_HUNDREDS[h]);
  const rest = n % 100;
  if (rest >= 20) {
    const t = Math.floor(rest / 10);
    parts.push(RU_TENS[t]);
    const o = rest % 10;
    if (o > 0) parts.push(feminine ? RU_ONES_F[o] : RU_ONES_M[o]);
  } else if (rest > 0) {
    parts.push(feminine ? RU_ONES_F[rest] : RU_ONES_M[rest]);
  }
  return parts.join(' ');
}

function numberToWordsRu(n: number): string {
  if (n === 0) return 'ноль';
  const parts: string[] = [];
  // billions
  const billions = Math.floor(n / 1_000_000_000);
  if (billions > 0) {
    parts.push(ruHundreds(billions, false) + ' ' + ruPlural(billions, 'миллиард', 'миллиарда', 'миллиардов'));
  }
  n %= 1_000_000_000;
  // millions
  const millions = Math.floor(n / 1_000_000);
  if (millions > 0) {
    parts.push(ruHundreds(millions, false) + ' ' + ruPlural(millions, 'миллион', 'миллиона', 'миллионов'));
  }
  n %= 1_000_000;
  // thousands (feminine in Russian)
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    parts.push(ruHundreds(thousands, true) + ' ' + ruPlural(thousands, 'тысяча', 'тысячи', 'тысяч'));
  }
  n %= 1000;
  if (n > 0) {
    parts.push(ruHundreds(n, false));
  }
  return parts.join(' ');
}

// ── Georgian (vigesimal system) ──────────────────────

const KA_ONES = ['', 'ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა',
  'ათი', 'თერთმეტი', 'თორმეტი', 'ცამეტი', 'თოთხმეტი', 'თხუთმეტი', 'თექვსმეტი', 'ჩვიდმეტი', 'თვრამეტი', 'ცხრამეტი'];

function kaUnder100(n: number): string {
  if (n === 0) return '';
  if (n < 20) return KA_ONES[n];
  if (n === 20) return 'ოცი';
  if (n === 40) return 'ორმოცი';
  if (n === 60) return 'სამოცი';
  if (n === 80) return 'ოთხმოცი';
  // Georgian vigesimal: 20*k + remainder
  const k = Math.floor(n / 20);
  const r = n % 20;
  const bases = ['', 'ოცდა', 'ორმოცდა', 'სამოცდა', 'ოთხმოცდა'];
  return bases[k] + KA_ONES[r];
}

function kaHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 100) return kaUnder100(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  // Drop trailing ი from the ones digit when forming the hundred prefix
  const prefix = h === 1 ? 'ას' : KA_ONES[h].replace(/ი$/, '') + 'ას';
  return rest > 0 ? prefix + ' ' + kaUnder100(rest) : prefix + 'ი';
}

function numberToWordsKa(n: number): string {
  if (n === 0) return 'ნული';
  const parts: string[] = [];
  // Extract all scale groups first so we can check what follows
  const billions = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;

  // Scale words drop trailing ი when followed by more numbers
  if (billions > 0) {
    const hasMore = millions > 0 || thousands > 0 || n > 0;
    const scale = hasMore ? 'მილიარდ' : 'მილიარდი';
    parts.push((billions === 1 ? '' : kaHundreds(billions) + ' ') + scale);
  }
  if (millions > 0) {
    const hasMore = thousands > 0 || n > 0;
    const scale = hasMore ? 'მილიონ' : 'მილიონი';
    parts.push((millions === 1 ? '' : kaHundreds(millions) + ' ') + scale);
  }
  if (thousands > 0) {
    const hasMore = n > 0;
    const scale = hasMore ? 'ათას' : 'ათასი';
    parts.push((thousands === 1 ? '' : kaHundreds(thousands) + ' ') + scale);
  }
  if (n > 0) {
    parts.push(kaHundreds(n));
  }
  return parts.join(' ');
}

// ── Turkish ──────────────────────────────────────────

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

function trHundreds(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  if (h > 0) {
    parts.push(h === 1 ? 'yüz' : TR_ONES[h] + ' yüz');
  }
  const rest = n % 100;
  const t = Math.floor(rest / 10);
  const o = rest % 10;
  if (t > 0) parts.push(TR_TENS[t]);
  if (o > 0) parts.push(TR_ONES[o]);
  return parts.join(' ');
}

function numberToWordsTr(n: number): string {
  if (n === 0) return 'sıfır';
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  if (billions > 0) {
    parts.push((billions === 1 ? '' : trHundreds(billions) + ' ') + 'milyar');
  }
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  if (millions > 0) {
    parts.push((millions === 1 ? '' : trHundreds(millions) + ' ') + 'milyon');
  }
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  if (thousands > 0) {
    parts.push((thousands === 1 ? '' : trHundreds(thousands) + ' ') + 'bin');
  }
  n %= 1000;
  if (n > 0) {
    parts.push(trHundreds(n));
  }
  return parts.join(' ');
}

// ── Main export ──────────────────────────────────────

const converters: Record<string, (n: number) => string> = {
  en: numberToWordsEn,
  ru: numberToWordsRu,
  ka: numberToWordsKa,
  tr: numberToWordsTr,
};

/**
 * Convert a numeric amount to words in the given language.
 * Format: "One thousand two hundred thirty-four and 56/100 USD"
 */
export function numberToWords(
  amount: number,
  language: InvoiceLanguage | string,
  currency: string,
): string {
  const convert = converters[language] || converters.en;
  const abs = Math.abs(amount);
  const intPart = Math.floor(abs);
  const decPart = Math.round((abs - intPart) * 100);

  let words = convert(intPart);
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);

  const andWord = language === 'ru' ? 'и' : language === 'ka' ? 'და' : language === 'tr' ? 've' : 'and';

  const decStr = String(decPart).padStart(2, '0');
  return `${words} ${andWord} ${decStr}/100 ${currency}`;
}
