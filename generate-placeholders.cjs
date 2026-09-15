const fs = require('fs');
const features = ["vehicles", "drivers", "documents", "trips", "tracking", "expenses", "analytics", "notifications", "settings", "maintenance"];
features.forEach(feature => {
  const comp = feature.charAt(0).toUpperCase() + feature.slice(1);
  const content = `export function ${comp}Page() { return <div className="p-4"><h1 className="text-2xl font-bold">${comp}</h1><p>Placeholder for ${feature}.</p></div>; }`;
  fs.writeFileSync(`src/features/${feature}/${comp}Page.tsx`, content);
});
