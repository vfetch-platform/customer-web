export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Chad', 'Chile', 'China', 'Colombia', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
  'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Trinidad and Tobago',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
] as const;

export const PHONE_CODES: { code: string; label: string; country: string }[] = [
  { code: '+1',   label: '+1',   country: 'United States / Canada' },
  { code: '+44',  label: '+44',  country: 'United Kingdom' },
  { code: '+61',  label: '+61',  country: 'Australia' },
  { code: '+91',  label: '+91',  country: 'India' },
  { code: '+971', label: '+971', country: 'UAE' },
  { code: '+65',  label: '+65',  country: 'Singapore' },
  { code: '+852', label: '+852', country: 'Hong Kong' },
  { code: '+353', label: '+353', country: 'Ireland' },
  { code: '+33',  label: '+33',  country: 'France' },
  { code: '+49',  label: '+49',  country: 'Germany' },
  { code: '+31',  label: '+31',  country: 'Netherlands' },
  { code: '+46',  label: '+46',  country: 'Sweden' },
  { code: '+47',  label: '+47',  country: 'Norway' },
  { code: '+45',  label: '+45',  country: 'Denmark' },
  { code: '+358', label: '+358', country: 'Finland' },
  { code: '+32',  label: '+32',  country: 'Belgium' },
  { code: '+41',  label: '+41',  country: 'Switzerland' },
  { code: '+43',  label: '+43',  country: 'Austria' },
  { code: '+351', label: '+351', country: 'Portugal' },
  { code: '+34',  label: '+34',  country: 'Spain' },
  { code: '+39',  label: '+39',  country: 'Italy' },
  { code: '+30',  label: '+30',  country: 'Greece' },
  { code: '+48',  label: '+48',  country: 'Poland' },
  { code: '+420', label: '+420', country: 'Czech Republic' },
  { code: '+36',  label: '+36',  country: 'Hungary' },
  { code: '+40',  label: '+40',  country: 'Romania' },
  { code: '+7',   label: '+7',   country: 'Russia' },
  { code: '+380', label: '+380', country: 'Ukraine' },
  { code: '+90',  label: '+90',  country: 'Turkey' },
  { code: '+81',  label: '+81',  country: 'Japan' },
  { code: '+82',  label: '+82',  country: 'South Korea' },
  { code: '+86',  label: '+86',  country: 'China' },
  { code: '+60',  label: '+60',  country: 'Malaysia' },
  { code: '+66',  label: '+66',  country: 'Thailand' },
  { code: '+63',  label: '+63',  country: 'Philippines' },
  { code: '+62',  label: '+62',  country: 'Indonesia' },
  { code: '+84',  label: '+84',  country: 'Vietnam' },
  { code: '+64',  label: '+64',  country: 'New Zealand' },
  { code: '+92',  label: '+92',  country: 'Pakistan' },
  { code: '+880', label: '+880', country: 'Bangladesh' },
  { code: '+94',  label: '+94',  country: 'Sri Lanka' },
  { code: '+966', label: '+966', country: 'Saudi Arabia' },
  { code: '+974', label: '+974', country: 'Qatar' },
  { code: '+965', label: '+965', country: 'Kuwait' },
  { code: '+973', label: '+973', country: 'Bahrain' },
  { code: '+968', label: '+968', country: 'Oman' },
  { code: '+962', label: '+962', country: 'Jordan' },
  { code: '+961', label: '+961', country: 'Lebanon' },
  { code: '+20',  label: '+20',  country: 'Egypt' },
  { code: '+27',  label: '+27',  country: 'South Africa' },
  { code: '+234', label: '+234', country: 'Nigeria' },
  { code: '+254', label: '+254', country: 'Kenya' },
  { code: '+212', label: '+212', country: 'Morocco' },
  { code: '+213', label: '+213', country: 'Algeria' },
  { code: '+55',  label: '+55',  country: 'Brazil' },
  { code: '+52',  label: '+52',  country: 'Mexico' },
  { code: '+54',  label: '+54',  country: 'Argentina' },
  { code: '+57',  label: '+57',  country: 'Colombia' },
  { code: '+56',  label: '+56',  country: 'Chile' },
];

/**
 * Returns the expected dial code for a country name, or null if unknown.
 * Used to validate that a phone number matches the selected delivery country.
 */
export function dialCodeForCountry(country: string): string | null {
  if (!country) return null;
  const normalised = country.trim().toLowerCase();
  const match = PHONE_CODES.find(p => {
    // Handle "United States / Canada" entry covering both
    return p.country.toLowerCase().split(/\s*\/\s*/).some(n => n.trim() === normalised);
  });
  return match?.code ?? null;
}

/**
 * Returns an error message if the phone number does not start with the
 * expected dial code for the given country, or null if valid / unknown country.
 */
export function validatePhoneForCountry(phone: string, country: string): string | null {
  const dialCode = dialCodeForCountry(country);
  if (!dialCode) return null; // country not in our list — don't block submission
  const digits = phone.replace(/[\s\-().]/g, '');
  if (!digits.startsWith(dialCode)) {
    return `Number must start with ${dialCode} for ${country}`;
  }
  return null;
}

