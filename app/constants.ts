/** Size patterns to match in titles **/
export const SIZE_PATTERNS = {
  "3XL": /\b(3XL|XXXL)\b/i,
  "2XL": /\b(2XL|XXL)\b/i,
  "Extra Large": /\b(Extra Large|XLarge|X-Large|XL)\b/i,
  Large: /\b(Large|L)\b/i,
  Medium: /\b(Medium|Med|M)\b/i,
  Small: /\b(Small|Sm|S)\b/i,
};

/** Color patterns to match in product titles **/
export const TITLE_COLOR_PATTERNS = {
  White: /\b(White|Wht)\b/i,
  "Vintage White": /\b(Vintage White)\b/i,
  Black: /\b(Black|Blk)\b/i,
  "Vintage Black": /\b(Vintage Black)\b/i,
  "Faded Black": /\b(Faded Black)\b/i,
  "Black Heather": /\b(Black Heather)\b/i,
  Gray: /\b(Gray|Gry)\b/i,
  Grey: /\b(Grey)\b/i,
  "Carbon Grey": /\b(Carbon Grey)\b/i,
  "Heathered Gray": /\b(Heathered Gray)\b/i,
  Crimson: /\b(Crimson|Crim)\b/i,
  Red: /\b(Red|Rd)\b/i,
  Green: /\b(Green)\b/i,
  "Army Green": /\b(Army Green)\b/i,
  Olive: /\b(Olive)\b/i,
  Charcoal: /\b(Charcoal)\b/i,
  Blue: /\b(Blue)\b/i,
  "Sky Blue": /\b(Sky Blue)\b/i,
  "Dark Brown": /\b(Dark Brown)\b/i,
  Orange: /\b(Orange)\b/i,
  Cream: /\b(Cream)\b/i,
  Oatmeal: /\b(Oatmeal)\b/i,
};

/** Color patterns to match in SKUs **/
export const SKU_COLOR_PATTERNS = {
  White: /WHT/i,
  Black: /BLK/i,
  Grey: /GRY/i,
  Red: /RED/i,
  Green: /GRN/i,
  Olive: /OLV/i,
  Blue: /(?:BLU|TL)/i,
  "Dark Brown": /BRN/i,
  Orange: /ORG/i,
  Cream: /CRM/i,
};