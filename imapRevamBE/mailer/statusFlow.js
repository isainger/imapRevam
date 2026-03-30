// mailer/statusFlow.js — timeline by firstStatus|currentStatus + known_issue index (progress-timeline on CDN)
const BASE =
  "https://cdn.taboola.com/images_incident_management/progress-timeline";

module.exports = {
  "suspected|suspected": [`${BASE}/suspected-rca-1.png`],
  "suspected|ongoing": [`${BASE}/suspected-rca-2.png`],
  "suspected|resolved": [`${BASE}/suspected-rca-3.png`],
  "suspected|resolved with rca": [`${BASE}/suspected-rca-4.png`],

  "ongoing|ongoing": [
    `${BASE}/ongoing-rca-1.png`,
    `${BASE}/ongoing-resolved-1.png`,
  ],
  "ongoing|resolved": [
    `${BASE}/ongoing-rca-2.png`,
    `${BASE}/ongoing-resolved-2.png`,
  ],
  "ongoing|resolved with rca": [`${BASE}/ongoing-rca-3.png`],

  "resolved|resolved": [`${BASE}/resolved-rca-1.png`, `${BASE}/resolved-2.png`],
  "resolved|resolved with rca": [`${BASE}/resolved-rca-1.png`],

  "resolved with rca|resolved with rca": [
    `${BASE}/Resolved-%20RCA-2.png`
  ],
};
