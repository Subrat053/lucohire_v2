function toExperienceLabel(experienceMonths) {
  const months = Number(experienceMonths || 0);
  if (!months) return '';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) return `${years} year ${rem} month`;
  if (years > 0) return `${years} year`;
  return `${rem} month`;
}

function buildSuggestions(intent) {
  if (intent === 'pricing_help') {
    return [
      'Apne city ke hisaab se starter, standard aur premium rate rakhiye.',
      'Visit charge alag mention kariye taaki confusion na ho.',
      'Client ko written quote bhejne ka template use kariye.',
    ];
  }

  if (intent === 'client_reply_help') {
    return [
      'Greeting + problem summary + next step format use kariye.',
      'Estimated timing aur expected cost range clearly bataiye.',
      'Close with polite CTA: "Agar theek lage to slot confirm kar dein".',
    ];
  }

  if (intent === 'job_search_help') {
    return [
      'Profile headline me skill + city + experience zarur likhiye.',
      'Recent kaam ki 2-3 photos/portfolio links add kariye.',
      'Lead aate hi 5 minute ke andar first reply bhejiye.',
    ];
  }

  if (intent === 'profile_help') {
    return [
      'Skill, city aur experience field complete rakhiye.',
      'Language preference add karne se response rate badhta hai.',
      'Short, trust-building description use kariye.',
    ];
  }

  if (intent === 'lead_help') {
    return [
      'Lead ko qualify karein: location, scope aur budget poochein.',
      'Fake/low-quality leads ko politely filter karein.',
      'Follow-up reminder 24 hours ke andar bhejein.',
    ];
  }

  return [
    'Apna skill, city aur experience share karein for better guidance.',
    'Aap pricing, profile, client reply ya job leads pe help le sakte hain.',
    'Main aapke context ke basis par next steps suggest karunga.',
  ];
}

function buildIntentReply(intent, extracted) {
  if (intent === 'pricing_help') {
    return 'Pricing set karte waqt aapko city demand, kaam ki complexity aur experience ke basis par 3-tier rate card banana chahiye.';
  }

  if (intent === 'client_reply_help') {
    return 'Client ko reply karte waqt short, polite aur action-oriented response bhejiye: greeting, issue understanding, estimate, aur next step.';
  }

  if (intent === 'job_search_help') {
    return 'Job opportunities improve karne ke liye profile completeness, fast response time, aur clear service scope bahut important hai.';
  }

  if (intent === 'profile_help') {
    return 'Aapka profile jitna specific hoga utne relevant leads milenge. Skill, city, experience aur languages complete rakhiye.';
  }

  if (intent === 'lead_help') {
    return 'Lead conversion ke liye qualification questions, quick follow-up aur clear quote template use karna best rahega.';
  }

  return 'Main aapki provider profile, pricing aur client communication me context-based help kar sakta hoon.';
}

function buildFallbackReply({ intent, extracted = {} }) {
  const contextParts = [];

  if (extracted.city) contextParts.push(`aap ${extracted.city} me kaam karte hain`);
  if (extracted.skill) contextParts.push(`aapka primary skill ${extracted.skill} hai`);
  if (Number(extracted.experienceMonths || 0) > 0) {
    contextParts.push(`aapke paas ${toExperienceLabel(extracted.experienceMonths)} ka experience hai`);
  }
  if (extracted.budget) contextParts.push(`budget context ${extracted.budget} noted hai`);

  const summary = contextParts.length
    ? `Samajh gaya, ${contextParts.join(' aur ')}.`
    : 'Samajh gaya, main aapki help karne ke liye ready hoon.';

  const reply = `${summary} ${buildIntentReply(intent, extracted)}`;

  return {
    reply,
    suggestions: buildSuggestions(intent),
  };
}

module.exports = {
  buildFallbackReply,
  buildSuggestions,
};
