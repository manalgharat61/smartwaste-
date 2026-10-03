/**
 * Priority scoring for pickup requests.
 * score = fill (0-40) + overflow (+25) + zone + waste_type + age_bonus (0-15)
 */
function calculatePriority({ fill_level = 0, overflowing = 0, zone_type = '', waste_type = '', created_at }) {
  let score = 0;
  const breakdown = {};

  // Fill level contribution (0–40)
  const fillScore = Math.round(Math.min(40, fill_level * 0.4));
  breakdown.fill = fillScore;
  score += fillScore;

  // Overflow bonus
  if (overflowing) { breakdown.overflow = 25; score += 25; }

  // Zone weight
  const zoneWeights = { hospital: 20, market: 18, school: 12, residential: 8, public: 8, industrial: 6 };
  const zoneScore = zoneWeights[zone_type] || 4;
  breakdown.zone = zoneScore;
  score += zoneScore;

  // Waste type weight
  const wasteWeights = { medical: 20, hazardous: 18, ewaste: 8, construction: 6, organic: 5, dry_recyclable: 5, others: 4 };
  const wasteScore = wasteWeights[waste_type] || 4;
  breakdown.waste_type = wasteScore;
  score += wasteScore;

  // Age bonus (+1 per 2 hours, capped at 15)
  const ageHours = created_at ? (Date.now() - new Date(created_at).getTime()) / 3600000 : 0;
  const ageScore = Math.min(15, Math.floor(ageHours / 2));
  breakdown.age = ageScore;
  score += ageScore;

  let level = 'Low';
  if (score >= 80) level = 'Urgent';
  else if (score >= 60) level = 'High';
  else if (score >= 40) level = 'Medium';

  return { score, level, breakdown };
}

module.exports = { calculatePriority };
