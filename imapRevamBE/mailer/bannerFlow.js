// mailer/bannerFlow.js — banner by department + current status (cdn.taboola.com)
const BASE = "https://cdn.taboola.com/images_incident_management";

module.exports = {
  "Publisher|Suspected": [`${BASE}/suspected-publisher.png`],
  "Publisher|Ongoing": [`${BASE}/ongoing-publisher.png`],
  "Publisher|Resolved": [`${BASE}/resolved-publisher.png`],
  "Publisher|Resolved with RCA": [`${BASE}/resolved-with-rca-publisher.png`],
  "Publisher|Not an Issue": [`${BASE}/not-an-issue-publisher.png`],

  "Advertiser|Suspected": [`${BASE}/suspected-advertiser.png`],
  "Advertiser|Ongoing": [`${BASE}/ongoing-advertiser.png`],
  "Advertiser|Resolved": [`${BASE}/resolved-advertiser.png`],
  "Advertiser|Resolved with RCA": [`${BASE}/resolved-with-rca-advertiser.png`],
  "Advertiser|Not an Issue": [`${BASE}/not-an-issue-advertiser.png`],

  "General|Suspected": [`${BASE}/suspected-general.png`],
  "General|Ongoing": [`${BASE}/ongoing-general.png`],
  "General|Resolved": [`${BASE}/resolved-general.png`],
  "General|Resolved with RCA": [`${BASE}/resolved-with-rca-general.png`],
  "General|Not an Issue": [`${BASE}/not-an-issue-general.png`],
};
