const GITHUB_BASE_URL =
  "https://raw.githubusercontent.com/RifqiNabil-dev/Image-Boss/refs/heads/main/images";
const defaultImage = "default_boss.png";

/**
 * Maps a boss name to its corresponding image filename and returns its GitHub URL.
 * @param {string} bossName - The name of the boss.
 * @returns {string} The URL to the image file on GitHub.
 */
function getBossImage(bossName) {
  if (!bossName) return `${GITHUB_BASE_URL}/${defaultImage}`;

  // 1. Convert camelCase to snake_case (e.g., DragonBeast -> Dragon_Beast)
  let normalized = bossName.replace(/([a-z])([A-Z])/g, "$1_$2");

  // 2. Lowercase and replace non-alphanumeric sequences with single underscore
  normalized = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .trim();

  // 3. Remove leading/trailing underscores
  normalized = normalized.replace(/^_+|_+$/g, "");

  const fileName = `${normalized}.png`;

  // We return the URL directly, as we assume it exists in the repo
  // or will fallback to a valid URL pattern.
  // Note: Since we can't easily check for remote existence synchronously,
  // we return the constructed URL.
  return `${GITHUB_BASE_URL}/${fileName}`;
}

module.exports = { getBossImage };
