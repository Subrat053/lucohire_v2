const CITY_DICTIONARY = [
  // ───────────────── INDIA ─────────────────
  { city: 'Delhi NCR', aliases: ['delhi ncr', 'ncr'] },
  { city: 'Delhi', aliases: ['delhi', 'new delhi'] },
  { city: 'Bhubaneswar', aliases: ['bhubaneswar', 'bhubaneshwar', 'bbsr'] },
  { city: 'Mumbai', aliases: ['mumbai', 'bombay'] },
  { city: 'Bangalore', aliases: ['bangalore', 'bengaluru', 'bengalooru'] },
  { city: 'Chennai', aliases: ['chennai', 'madras'] },
  { city: 'Kolkata', aliases: ['kolkata', 'calcutta'] },
  { city: 'Hyderabad', aliases: ['hyderabad'] },
  { city: 'Pune', aliases: ['pune', 'poona'] },
  { city: 'Noida', aliases: ['noida'] },
  { city: 'Gurgaon', aliases: ['gurgaon', 'gurugram'] },
  { city: 'Ahmedabad', aliases: ['ahmedabad'] },
  { city: 'Jaipur', aliases: ['jaipur'] },
  { city: 'Lucknow', aliases: ['lucknow'] },
  { city: 'Patna', aliases: ['patna'] },
  { city: 'Surat', aliases: ['surat'] },
  { city: 'Indore', aliases: ['indore'] },
  { city: 'Nagpur', aliases: ['nagpur'] },
  { city: 'Chandigarh', aliases: ['chandigarh'] },
  { city: 'Coimbatore', aliases: ['coimbatore'] },
  { city: 'Faridabad', aliases: ['faridabad'] },
  { city: 'Ghaziabad', aliases: ['ghaziabad'] },
  { city: 'Greater Noida', aliases: ['greater noida'] },
  { city: 'Thane', aliases: ['thane'] },
  { city: 'Visakhapatnam', aliases: ['visakhapatnam', 'vizag'] },

  // ───────────────── USA ─────────────────
  { city: 'New York', aliases: ['new york', 'nyc', 'new york city'] },
  { city: 'Los Angeles', aliases: ['los angeles', 'la', 'l.a.'] },
  { city: 'San Francisco', aliases: ['san francisco', 'sf', 'bay area'] },
  { city: 'Chicago', aliases: ['chicago'] },
  { city: 'Houston', aliases: ['houston'] },
  { city: 'Dallas', aliases: ['dallas'] },
  { city: 'Miami', aliases: ['miami'] },
  { city: 'Seattle', aliases: ['seattle'] },
  { city: 'Boston', aliases: ['boston'] },
  { city: 'Washington DC', aliases: ['washington dc', 'dc', 'washington d.c.'] },
  { city: 'Las Vegas', aliases: ['las vegas', 'vegas'] },
  { city: 'Atlanta', aliases: ['atlanta'] },

  // ───────────────── UK ─────────────────
  { city: 'London', aliases: ['london'] },
  { city: 'Manchester', aliases: ['manchester'] },
  { city: 'Birmingham', aliases: ['birmingham'] },
  { city: 'Liverpool', aliases: ['liverpool'] },
  { city: 'Leeds', aliases: ['leeds'] },
  { city: 'Glasgow', aliases: ['glasgow'] },
  { city: 'Edinburgh', aliases: ['edinburgh'] },

  // ───────────────── CANADA ─────────────────
  { city: 'Toronto', aliases: ['toronto'] },
  { city: 'Vancouver', aliases: ['vancouver'] },
  { city: 'Montreal', aliases: ['montreal'] },
  { city: 'Calgary', aliases: ['calgary'] },
  { city: 'Ottawa', aliases: ['ottawa'] },

  // ───────────────── AUSTRALIA ─────────────────
  { city: 'Sydney', aliases: ['sydney'] },
  { city: 'Melbourne', aliases: ['melbourne'] },
  { city: 'Brisbane', aliases: ['brisbane'] },
  { city: 'Perth', aliases: ['perth'] },
  { city: 'Adelaide', aliases: ['adelaide'] },

  // ───────────────── UAE ─────────────────
  { city: 'Dubai', aliases: ['dubai'] },
  { city: 'Abu Dhabi', aliases: ['abu dhabi'] },
  { city: 'Sharjah', aliases: ['sharjah'] },

  // ───────────────── SINGAPORE ─────────────────
  { city: 'Singapore', aliases: ['singapore', 'sg'] },

  // ───────────────── JAPAN ─────────────────
  { city: 'Tokyo', aliases: ['tokyo'] },
  { city: 'Osaka', aliases: ['osaka'] },
  { city: 'Kyoto', aliases: ['kyoto'] },

  // ───────────────── CHINA ─────────────────
  { city: 'Beijing', aliases: ['beijing', 'peking'] },
  { city: 'Shanghai', aliases: ['shanghai'] },
  { city: 'Shenzhen', aliases: ['shenzhen'] },
  { city: 'Guangzhou', aliases: ['guangzhou', 'canton'] },
  { city: 'Hong Kong', aliases: ['hong kong', 'hk'] },

  // ───────────────── EUROPE ─────────────────
  { city: 'Paris', aliases: ['paris'] },
  { city: 'Berlin', aliases: ['berlin'] },
  { city: 'Munich', aliases: ['munich', 'muenchen'] },
  { city: 'Amsterdam', aliases: ['amsterdam'] },
  { city: 'Madrid', aliases: ['madrid'] },
  { city: 'Barcelona', aliases: ['barcelona'] },
  { city: 'Rome', aliases: ['rome', 'roma'] },
  { city: 'Milan', aliases: ['milan', 'milano'] },
  { city: 'Zurich', aliases: ['zurich'] },
  { city: 'Vienna', aliases: ['vienna'] },
  { city: 'Prague', aliases: ['prague'] },
  { city: 'Dublin', aliases: ['dublin'] },

  // ───────────────── MIDDLE EAST ─────────────────
  { city: 'Doha', aliases: ['doha'] },
  { city: 'Riyadh', aliases: ['riyadh'] },
  { city: 'Jeddah', aliases: ['jeddah'] },
  { city: 'Kuwait City', aliases: ['kuwait city'] },

  // ───────────────── AFRICA ─────────────────
  { city: 'Cape Town', aliases: ['cape town'] },
  { city: 'Johannesburg', aliases: ['johannesburg', 'joburg'] },
  { city: 'Nairobi', aliases: ['nairobi'] },
  { city: 'Cairo', aliases: ['cairo'] },

  // ───────────────── SOUTH EAST ASIA ─────────────────
  { city: 'Bangkok', aliases: ['bangkok'] },
  { city: 'Jakarta', aliases: ['jakarta'] },
  { city: 'Manila', aliases: ['manila'] },
  { city: 'Kuala Lumpur', aliases: ['kuala lumpur', 'kl'] },
  { city: 'Ho Chi Minh City', aliases: ['ho chi minh city', 'saigon'] },

  // ───────────────── SOUTH AMERICA ─────────────────
  { city: 'Sao Paulo', aliases: ['sao paulo', 'são paulo'] },
  { city: 'Rio de Janeiro', aliases: ['rio de janeiro', 'rio'] },
  { city: 'Buenos Aires', aliases: ['buenos aires'] },
  { city: 'Lima', aliases: ['lima'] },

  // ───────────────── RUSSIA ─────────────────
  { city: 'Moscow', aliases: ['moscow'] },
  { city: 'Saint Petersburg', aliases: ['saint petersburg', 'st petersburg'] },
];

module.exports = {
  CITY_DICTIONARY,
};