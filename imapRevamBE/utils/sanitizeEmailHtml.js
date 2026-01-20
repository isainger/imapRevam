module.exports = function sanitizeEmailHtml(input) {
  if (input === null || input === undefined) return "";

  if (typeof input === "string") {
    return input
      .replace(/<p>/gi, '<div style="margin:0;padding:0;">')
      .replace(/<\/p>/gi, "</div>")
      .replace(/<strong>/gi, '<strong style="font-weight:600;">');
  }

  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }

  return "";
};