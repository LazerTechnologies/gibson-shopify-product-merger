/** Constants **/
import {SIZE_PATTERNS, TITLE_COLOR_PATTERNS, SKU_COLOR_PATTERNS} from "@/app/constants";

/** Clean title and extract size/color helper function **/
export const processMergeProductTitle = (title: string, sku: string): { 
  cleanedTitle: string;
  size: string;
  color: string;
} => {
  let workingTitle = title;
  let foundSize = '';
  let foundColor = '';

  /** Find size match - now ordered from largest to smallest to avoid partial matches **/
  for (const [size, pattern] of Object.entries(SIZE_PATTERNS)) {
    if (pattern.test(workingTitle)) {
      foundSize = size;
      workingTitle = workingTitle.replace(new RegExp(pattern.source, 'gi'), '');
      break;
    };
  };

  /** If no size found in title, check SKU **/
  if (!foundSize && sku) {
    for (const [size, pattern] of Object.entries(SIZE_PATTERNS)) {
      if (pattern.test(sku)) {
        foundSize = size;
        break;
      };
    };
  };

  /** Find color match from title first **/
  for (const [color, pattern] of Object.entries(TITLE_COLOR_PATTERNS)) {
    if (pattern.test(workingTitle)) {
      foundColor = color;
      workingTitle = workingTitle.replace(new RegExp(pattern.source, 'gi'), '');
      break;
    };
  };

  /** If no color found in title, check SKU **/
  if (!foundColor && sku) {
    for (const [color, pattern] of Object.entries(SKU_COLOR_PATTERNS)) {
      if (pattern.test(sku)) {
        foundColor = color;
        break;
      };
    };
  };

  /** Clean remaining title **/
  let cleanedTitle = workingTitle
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  /** Remove common problematic words that might remain **/
  cleanedTitle = cleanedTitle
    .replace(/\bExtra\b$/i, '') /** Remove "Extra" if it's at the end of the title **/
    .replace(/\bX\b$/i, '') /** Remove "X" if it's at the end of the title **/
    .replace(/\bBlock\b/i, '') /** Remove "Block" **/
    .replace(/\bNavy\b/i, '') /** Remove "Navy" **/
    .replace(/\b3X\b/i, '') /** Remove "3X" **/
    .replace(/\bBeige\b/i, '') /** Remove "Beige" **/
    .replace(/\bMD\b/i, '') /** Remove "MD" **/
    .replace(/\s+/g, ' ') /** Clean up any double spaces created by removals **/
    .trim();

  return {
    cleanedTitle: cleanedTitle,
    size: foundSize,
    color: foundColor,
  };
};