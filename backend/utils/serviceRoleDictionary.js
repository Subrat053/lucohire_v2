const ROLE_DEFINITIONS = [
  {
    key: 'painter',
    roleLabel: 'Painter',
    category: 'Painting',
    synonyms: [
      'painter', 'painting', 'paint', 'penter', 'wall painter',
      'rang ka kaam', 'rang ka kam', 'rang ka kaam karta', 'chitra kam', 'colour work', 'color work',
    ],
    inferredSkills: ['Painting', 'Wall Painting', 'Color Work'],
  },
  {
    key: 'electrician',
    roleLabel: 'Electrician',
    category: 'Electrical',
    synonyms: [
      'electrician', 'electrical', 'electrcian', 'wireman', 'wiring',
      'bijli ka kaam', 'bijli ka kam', 'switch board', 'switchboard', 'current ka kaam',
    ],
    inferredSkills: ['Electrical Repair', 'Wiring', 'Switchboard Work'],
  },
  {
    key: 'plumber',
    roleLabel: 'Plumber',
    category: 'Plumbing',
    synonyms: [
      'plumber', 'plumbr', 'pipe fitting', 'pipefitting', 'pipeline',
      'nal ka kaam', 'nal ka kam', 'bathroom fitting', 'fitting ka kaam',
    ],
    inferredSkills: ['Plumbing', 'Pipe Fitting', 'Bathroom Fitting'],
  },
  {
    key: 'carpenter',
    roleLabel: 'Carpenter',
    category: 'Carpentry',
    synonyms: [
      'carpenter', 'wood work', 'woodworker', 'furniture work', 'furniture repair',
      'lakdi ka kaam', 'lakdi ka kam', 'badhai',
    ],
    inferredSkills: ['Carpentry', 'Furniture Repair', 'Wood Work'],
  },
  {
    key: 'cleaner',
    roleLabel: 'Cleaning Worker',
    category: 'Cleaning',
    synonyms: [
      'cleaner', 'cleaning', 'house cleaning', 'housekeeping', 'maid',
      'safai', 'ghar safai', 'jhaadu pocha', 'jhaadu', 'pocha',
    ],
    inferredSkills: ['House Cleaning', 'Deep Cleaning', 'Housekeeping'],
  },
  {
    key: 'driver',
    roleLabel: 'Driver',
    category: 'Driving',
    synonyms: [
      'driver', 'driving', 'chauffeur', 'car driver', 'auto driver',
      'gaadi chalata', 'gaadi chalata hu', 'vehicle driver',
    ],
    inferredSkills: ['Driving', 'Personal Driver', 'Commercial Driver'],
  },
  {
    key: 'appliance_repair',
    roleLabel: 'Appliance Repair Technician',
    category: 'Appliance Repair',
    synonyms: [
      'ac repair', 'ac service', 'air conditioner repair', 'fridge repair',
      'refrigerator repair', 'washing machine repair', 'appliance repair',
      'cooler repair', 'tv repair',
    ],
    inferredSkills: ['AC Repair', 'Fridge Repair', 'Home Appliance Service'],
  },
  {
    key: 'beauty_services',
    roleLabel: 'Beauty Service Professional',
    category: 'Beauty Services',
    synonyms: [
      'beautician', 'beauty parlour', 'beauty parlor', 'makeup', 'make up',
      'bridal makeup', 'salon work', 'hair styling',
    ],
    inferredSkills: ['Makeup', 'Beauty Care', 'Salon Services'],
  },
];

module.exports = {
  ROLE_DEFINITIONS,
};
