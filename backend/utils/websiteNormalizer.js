/**
 * Validates and normalizes website URLs.
 * @param {String} input - The website URL input
 * @returns {String|null}
 */
function normalizeWebsiteUrl(input) {
  if (!input) return null;

  let url = String(input).trim();
  if (!url) return null;

  // Reject URLs with spaces
  if (/\s/.test(url)) {
    throw new Error("Invalid website URL: URLs cannot contain spaces");
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Basic regex validation
  if (!/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(url)) {
    throw new Error("Invalid website URL format");
  }

  // URL Constructor check
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    throw new Error("Invalid website URL");
  }

  // Verify protocol is http or https only
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid website protocol: only http or https is allowed");
  }

  return parsed.toString();
}

module.exports = {
  normalizeWebsiteUrl,
};
