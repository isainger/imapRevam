// const sharp = require("sharp");

// function generateHeaderSvg({ title, incidentId, status }) {
//   const STATUS_CONFIG = {
//     suspected: { color: "#F59E0B", textLength: 115 },
//     ongoing: { color: "#EF4444", textLength: 95 },
//     resolved: { color: "#10B981", textLength: 107 },
//     "resolved with rca": { color: "#3B82F6", textLength: 190 },
//   };

//   const key = String(status || "").toLowerCase();
//   const cfg = STATUS_CONFIG[key];

//   const label = String(status || "").toUpperCase();

//   return `
// <svg xmlns="http://www.w3.org/2000/svg"
//      width="650"
//      height="140"
//      viewBox="0 0 650 140">

//   <!-- Title -->
//   <text
//     x="0"
//     y="20"
//     fill="#FFFFFF"
//     font-size="30"
//     font-family="Poppins, Arial, sans-serif">
//     ${title}
//   </text>

//   <!-- Incident ID -->
//   <text
//     x="0"
//     y="50"
//     fill="#E0E7FF"
//     font-size="16"
//     font-family="Poppins, Arial, sans-serif">
//     Incident ID: ${incidentId}
//   </text>

//   <!-- STATUS PILL -->
//   <g transform="translate(2, 80)">
//     <rect
//       x="0"
//       y="0"
//       rx="5"
//       ry="5"
//       width="${cfg.textLength}"
//       height="40"
//       fill="none"
//       stroke="${cfg.color}"
//       stroke-width="2"
//     />

//     <text
//       x="1"
//       y="20"
//       dx="0.5em"
//       text-anchor="central"
//       dominant-baseline="middle"
//       alignment-baseline="central"
//       textLength="${cfg.textLength - 2}"
//       lengthAdjust="spacingAndGlyphs"
//       fill="#FFFFFF"
//       font-size="16"
//       font-weight="500"
//       font-family="Poppins, Arial, sans-serif">
//       ${label}
//     </text>
//   </g>
// </svg>
// `;
// }



// /**
//  * High-quality PNG (retina-safe)
//  */
// async function generateHeaderPng({ title, incidentId, status }) {
//   const svg = generateHeaderSvg({ title, incidentId, status });

//   const WIDTH = 650;
//   const HEIGHT = 140;
//   const SCALE = 3;

//   return sharp(Buffer.from(svg), { density: 300 })
//     .resize(WIDTH * SCALE, HEIGHT * SCALE)
//     .png({
//       quality: 100,
//       compressionLevel: 9,
//       adaptiveFiltering: true,
//     })
//     .toBuffer();
// }

// module.exports = generateHeaderPng;

