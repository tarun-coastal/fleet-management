#!/bin/bash
features=("vehicles" "drivers" "documents" "trips" "tracking" "expenses" "analytics" "notifications" "settings" "maintenance")
for feature in "${features[@]}"; do
  echo "export function ${feature^}Page() { return <div className=\"p-4\"><h1 className=\"text-2xl font-bold\">${feature^}</h1><p>Placeholder for ${feature}.</p></div>; }" > "src/features/${feature}/${feature^}Page.tsx"
done
