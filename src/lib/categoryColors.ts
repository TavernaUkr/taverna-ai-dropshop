// Dynamic category color system based on category ID hash
// Colors persist across sessions because they're deterministic

const categoryGradients = [
  "from-emerald-500 to-emerald-700",
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-cyan-500 to-cyan-700",
  "from-amber-500 to-amber-700",
  "from-red-500 to-red-700",
  "from-indigo-500 to-indigo-700",
  "from-teal-500 to-teal-700",
  "from-rose-500 to-rose-700",
  "from-lime-500 to-lime-700",
];

const categoryBgColors = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-lime-500",
];

/**
 * Generate a deterministic hash from a string (category ID)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a persistent gradient for a category based on its ID
 * The color will always be the same for the same category ID
 */
export function getCategoryGradient(categoryId: string): string {
  const hash = hashString(categoryId);
  return categoryGradients[hash % categoryGradients.length];
}

/**
 * Get a persistent background color for a category based on its ID
 */
export function getCategoryBgColor(categoryId: string): string {
  const hash = hashString(categoryId);
  return categoryBgColors[hash % categoryBgColors.length];
}

/**
 * Get both gradient and bg color for a category
 */
export function getCategoryColors(categoryId: string): {
  gradient: string;
  bgColor: string;
} {
  const hash = hashString(categoryId);
  const index = hash % categoryGradients.length;
  return {
    gradient: categoryGradients[index],
    bgColor: categoryBgColors[index],
  };
}
