import useTranslation from "../../hooks/useTranslation";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage, uploadResume } from '../../services/providerAIService';
import { ALL_SKILLS } from '../../pages/provider/Profile';
import ProviderAIDebugPanel from './ProviderAIDebugPanel';
import toast from 'react-hot-toast';

const QUICK_CHIPS = [
  'Client ka message polite aur effective kaise reply karu?',
  'Mujhe pricing kaise set karni chahiye?',
  'Profile improve kaise karu?',
];

function makeId(prefix = 'm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ProviderAIChat({ profileContext = {}, missingFields = [], onUpdateField, inline = false, aiUsage = {} }) {
  const {
    t
  } = useTranslation();

  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(inline);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [debugState, setDebugState] = useState({
    lastApiStatus: 'idle',
    lastIntent: '',
    lastSkill: '',
    lastCity: '',
    usedLLM: false,
    fallbackReason: '',
  });

  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeLoadingState, setResumeLoadingState] = useState(''); // 'uploading', 'extracting text', 'analyzing'
  const [resumeError, setResumeError] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);

  const findBestSkillMatch = (parsedSkill) => {
    if (!parsedSkill) return null;
    const normalized = parsedSkill.trim().toLowerCase();
    
    // 1. Case-insensitive exact match in ALL_SKILLS
    const exactMatch = ALL_SKILLS.find(s => s.toLowerCase() === normalized);
    if (exactMatch) return exactMatch;
    
    // 2. Safe substring check (only for whole words)
    const substringMatch = ALL_SKILLS.find(s => {
      const sLower = s.toLowerCase();
      // Only match if it's a significant word (>3 chars) and is bounded
      return (normalized.length >= 3 && sLower.includes(normalized)) || 
             (sLower.length >= 3 && normalized.includes(sLower));
    });
    
    if (substringMatch) return substringMatch;
    
    // 3. Instead of returning null and erasing the skill, return the properly capitalized raw skill
    return parsedSkill.trim();
  };

  const normalizeSkillLevel = (level) => {
    if (!level) return 'unskilled';
    const norm = String(level).toLowerCase().replace('_', '-');
    if (norm === 'semi-skilled' || norm === 'semiskilled' || norm === 'semi-skilled' || norm === 'semi_skilled') return 'semi-skilled';
    if (norm === 'skilled' || norm === 'expert') return 'skilled';
    return 'unskilled';
  };

  const calculatePricing = (skillTier, experienceText, cityText) => {
    const tier1Cities = new Set([
      "delhi", "mumbai", "bengaluru", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "noida", "gurgaon", "delhi ncr"
    ]);
    const tier2Cities = new Set([
      "jaipur", "lucknow", "surat", "bhopal", "indore", "nagpur", "patna", "chandigarh", "coimbatore", "ghaziabad"
    ]);

    let baseRate = 150; // unskilled
    if (skillTier === 'semi-skilled') baseRate = 250;
    else if (skillTier === 'skilled') baseRate = 400;

    let expMultiplier = 1.0;
    const exp = String(experienceText || '').toLowerCase();
    if (exp.includes('5+') || exp.includes('5 years') || exp.includes('senior')) {
      expMultiplier = 1.5;
    } else if (exp.includes('3-5') || exp.includes('3 years') || exp.includes('4 years')) {
      expMultiplier = 1.3;
    } else if (exp.includes('1-3') || exp.includes('1 years') || exp.includes('2 years')) {
      expMultiplier = 1.15;
    }

    let cityMultiplier = 1.0;
    const city = String(cityText || '').toLowerCase().trim();
    if (tier1Cities.has(city)) {
      cityMultiplier = 1.3;
    } else if (tier2Cities.has(city)) {
      cityMultiplier = 1.1;
    }

    return Math.round(baseRate * expMultiplier * cityMultiplier);
  };

  const handleResumeUpload = async (e) => {
    // Check limits first
    const limit = aiUsage?.limits?.resumeImprovement;
    const used = aiUsage?.usage?.resumeImprovement || 0;
    const isUnlimited = limit === 99999 || limit === -1;
    
    if (limit !== undefined && limit !== null && !isUnlimited && (limit - used <= 0)) {
      toast.error('Resume upload limit reached. Please upgrade your plan.');
      setResumeError('Resume upload limit reached. Please upgrade your plan.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB cap)
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File size must be under 5 MB.');
      toast.error('File size must be under 5 MB.');
      return;
    }

    // Validate extension
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setResumeError('16. Invalid file. Allowed formats: PDF, DOCX, DOC, JPG, JPEG, PNG, WEBP.');
      toast.error('Only PDF, DOCX, DOC, and standard images are allowed.');
      return;
    }

    // Block exe/js/html/svg/csv/xls/xlsx
    const blockedExtensions = ['.exe', '.js', '.html', '.htm', '.svg', '.csv', '.xls', '.xlsx'];
    if (blockedExtensions.includes(fileExt)) {
      setResumeError('16. Unsupported file type. Executable files, scripts, and spreadsheets (CSV, XLS, XLSX) are not allowed.');
      toast.error('Executable files, scripts, and spreadsheets (CSV, XLS, XLSX) are blocked.');
      return;
    }

    setResumeError('');
    setResumeLoading(true);
    setResumeLoadingState('uploading');

    const formData = new FormData();
    formData.append('resume', file);

    const toastId = toast.loading('Uploading resume...');

    try {
      // Step-by-step loading state animations
      setTimeout(() => setResumeLoadingState('extracting text'), 1500);
      setTimeout(() => setResumeLoadingState('analyzing'), 3500);

      const { data } = await uploadResume(formData);
      
      toast.success('Resume parsed successfully!', { id: toastId });
      
      // Open editable preview before applying, smart merge suggestions with non-empty existing profileContext values
      const rawAi = data.data || {};
      if (data.fileHash) {
        localStorage.setItem('lastResumeHash', data.fileHash);
      }

      // 1. Normalize skillLevel
      const rawLevel = rawAi.skillLevel || profileContext.skillTier || 'unskilled';
      const finalSkillLevel = normalizeSkillLevel(rawLevel);

      // 2. Match skills and specialities with ALL_SKILLS
      const rawSkills = Array.isArray(rawAi.skills) ? rawAi.skills : [];
      const matchedSkills = rawSkills.map(s => findBestSkillMatch(s)).filter(Boolean);
      
      const rawSpecs = Array.isArray(rawAi.specialities) ? rawAi.specialities : [];
      const matchedSpecs = rawSpecs.map(s => findBestSkillMatch(s)).filter(Boolean);

      const finalSkills = matchedSkills.length > 0 ? [...new Set(matchedSkills)] : (profileContext.skills || []);
      const finalSpecialities = matchedSpecs.length > 0 ? [...new Set(matchedSpecs)] : (profileContext.skills || []);

      // 3. Platform Pricing Engine
      const expVal = rawAi.experienceYears || profileContext.experience || '';
      const cityVal = rawAi.city || profileContext.city || '';
      const calculatedPricing = calculatePricing(finalSkillLevel, expVal, cityVal);
      const aiSuggestedPrice = Number(rawAi.pricing) || 420;

      // 4. Clean Contact Number
      let cleanPhone = String(rawAi.contactNumber || profileContext.phone || '').trim();
      cleanPhone = cleanPhone.replace(/^\+?91\s*/, ''); // Remove +91 prefix
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.substring(2); // Remove leading 91
      }

      const merged = {
        fullName: rawAi.fullName || profileContext.name || '',
        contactNumber: cleanPhone,
        bio: rawAi.bio || profileContext.description || '',
        skills: finalSkills,
        specialities: finalSpecialities,
        skillLevel: finalSkillLevel,
        experienceYears: expVal,
        serviceCategory: rawAi.serviceCategory || profileContext.category || '',
        city: cityVal,
        serviceLocations: (rawAi.serviceLocations && rawAi.serviceLocations.length > 0)
          ? rawAi.serviceLocations
          : (profileContext.serviceLocations?.map(l => l.formattedAddress || l.name) || profileContext.locations || []),
        languages: (rawAi.languages && rawAi.languages.length > 0) ? rawAi.languages : (profileContext.languages || []),
        pricing: calculatedPricing,
        pricingType: rawAi.pricingType || profileContext.pricingType || 'hourly',
        pricingReason: `AI suggested ₹${aiSuggestedPrice}/${rawAi.pricingType || 'hr'} based on skills, experience, and location.`,
        portfolioLinks: (rawAi.portfolioLinks && rawAi.portfolioLinks.length > 0)
          ? rawAi.portfolioLinks
          : (profileContext.portfolioLinks || []),
        availability: rawAi.availability || profileContext.availability || 'full-time',
        whatsappAlerts: rawAi.whatsappAlerts !== null ? rawAi.whatsappAlerts : (profileContext.whatsappAlerts ?? true),
        resumeUrl: rawAi.resumeUrl || ''
      };
      setParsedPreview(merged);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || '16. AI parsing failed. Failed to parse resume details.';
      setResumeError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setResumeLoading(false);
      setResumeLoadingState('');
    }
  };

  const applyResumeChanges = () => {
    if (!parsedPreview) return;

    const suggestions = parsedPreview;

    // Apply all reviewed fields directly from the modal's suggestions
    const bulkData = {
      // 1. fullName -> name, profileName
      name: suggestions.fullName || '',
      profileName: suggestions.fullName || '',
      
      // 2. contactNumber -> phone
      phone: suggestions.contactNumber || '',
      
      // 3. bio -> description
      description: suggestions.bio || '',
      
      // 4. skills & specialities -> skills
      skills: (suggestions.specialities && suggestions.specialities.length > 0)
        ? suggestions.specialities
        : (suggestions.skills || []),
      
      // 5. skillLevel -> tier
      tier: suggestions.skillLevel || 'unskilled',
      
      // 6. experienceYears -> experience
      experience: suggestions.experienceYears || '',
      
      // 7. city & serviceLocations -> city, nearestLocation, locations
      city: suggestions.city || '',
      nearestLocation: suggestions.city || '',
      locations: (suggestions.serviceLocations || []).map(loc => {
        if (typeof loc === 'string') {
          return {
            placeId: '',
            name: loc,
            formattedAddress: loc,
            isLegacy: true,
          };
        }
        return loc;
      }),
      
      // 8. languages -> languages
      languages: suggestions.languages || [],
      
      // 9. pricing & pricingType -> pricing, pricingType
      pricing: suggestions.pricing ? String(suggestions.pricing) : '',
      pricingType: suggestions.pricingType || 'hourly',
      pricingReason: suggestions.pricingReason || '',
      
      // 10. portfolioLinks -> portfolioLinks (with pending approval status)
      portfolioLinks: (suggestions.portfolioLinks || []).map(link => ({
        platform: String(link.platform || 'Personal Website').trim(),
        url: String(link.url || '').trim(),
        status: link.status || 'pending',
        isPublic: link.isPublic || false,
        approvedAt: link.approvedAt || null
      })).filter(l => l.url),

      // 11. whatsappAlerts
      whatsappAlerts: suggestions.whatsappAlerts !== null ? suggestions.whatsappAlerts : true,

      // 12. resumeUrl
      resumeUrl: suggestions.resumeUrl || ''
    };

    if (onUpdateField) {
      onUpdateField('bulk', bulkData);
    }

    toast.success('Resume details successfully applied to your draft! Please save draft below.');
    setParsedPreview(null);
  };

  const listRef = useRef(null);
  const isDev = import.meta.env.DEV;

  // Skill -> Speciality mapping rules
  const SKILL_TO_SPECIALITY = {
    'web development': 'Web Developer',
    'full stack development': 'Full Stack Developer',
    'plumbing': 'Plumber',
    'ac repair': 'AC Mechanic',
    'ac technician': 'AC Mechanic',
    'digital marketing': 'Digital Marketer',
  };

  const mapSkillToSpeciality = (skill) => {
    if (!skill) return skill;
    const lower = String(skill).toLowerCase().trim();
    return SKILL_TO_SPECIALITY[lower] || skill;
  };

  const generateAutoBio = (ctx) => {
    const name = ctx.name || (user && user.name) || 'The provider';
    const skills = Array.isArray(ctx.skills) && ctx.skills.length > 0 ? ctx.skills : (ctx.category ? [ctx.category] : []);
    const skillLabel = skills.join(', ');
    const tier = ctx.skillTier || '';
    const exp = ctx.experience || (ctx.experienceMonths ? `${Math.round(ctx.experienceMonths/12)} years` : 'some experience');
    const city = ctx.city || '';
    const pricing = ctx.pricing ? `₹${ctx.pricing}/${ctx.pricingType || 'hr'}` : '';
    const parts = [];
    parts.push(`${name} is${tier ? ' a ' + tier + ' ' : ' '}professional`);
    if (skillLabel) parts.push(`specialising in ${skillLabel}`);
    if (exp) parts.push(`with ${exp} of experience`);
    if (city) parts.push(`based in ${city}`);
    if (pricing) parts.push(`and typically charges around ${pricing}`);
    return parts.join(' ') + '.';
  };

  const recentMessages = useMemo(
    () => messages.slice(-8).map((item) => ({ author: item.author, text: item.text })),
    [messages]
  );

  useEffect(() => {
    if (!isOpen) return;
    const container = listRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isOpen]);

  const bioGeneratedRef = useRef(false);
  const passiveSkillsMappedRef = useRef(false);

  // Initial passive inference: map skills -> speciality and auto-generate bio when appropriate
  useEffect(() => {
    // Map existing skills to speciality labels without asking the user
    try {
      if (!passiveSkillsMappedRef.current && profileContext && Array.isArray(profileContext.skills) && profileContext.skills.length > 0 && onUpdateField) {
        const mapped = profileContext.skills.map(s => mapSkillToSpeciality(s));
        // Only update if mapping changed something
        const changed = mapped.some((m, idx) => m !== profileContext.skills[idx]);
        if (changed) {
          passiveSkillsMappedRef.current = true;
          onUpdateField('skills', mapped);
        } else {
          // If no change needed, mark as mapped so we don't keep checking
          passiveSkillsMappedRef.current = true;
        }
      }

      // Auto-generate a bio if missing or too short
      const hasDescription = profileContext.description && String(profileContext.description).trim().length >= 20;
      if (!hasDescription && onUpdateField && !bioGeneratedRef.current) {
        const bio = generateAutoBio(profileContext);
        if (bio) {
          bioGeneratedRef.current = true;
          onUpdateField('description', bio);
          // Prepend an assistant message to preview generated bio
          setMessages((prev) => [
            ...prev,
            { id: makeId('assistant-bio'), author: 'assistant', text: `Suggested Bio:\n${bio}` },
          ]);
        }
      }
    } catch (e) {
      if (isDev) console.error('[ProviderAIChat] passive inference error', e);
    }
    // We only want to run this on mount/profileContext change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileContext]);

  const welcomeText = useMemo(() => {
    if (Array.isArray(missingFields) && missingFields.length > 0) {
      return `Namaste! Main aapka AI Profile Assistant hoon. Mujhe lagta hai aapki profile me kuch details missing hain:\n- ${missingFields.join('\n- ')}\n\nChaliye inhein complete karte hain! Sabse pehle, aap apna **${missingFields[0]}** bataiye?`;
    }
    return 'Namaste! Main aapka AI Profile Assistant hoon. Aapki profile complete hai! Aap mujhse pricing, client reply ya general queries me help le sakte hain.';
  }, [missingFields]);

  useEffect(() => {
    setMessages((prev) => {
      const hasUserMessages = prev.some((m) => m.author === 'user');
      if (!hasUserMessages) {
        return [
          {
            id: 'ai-welcome',
            author: 'assistant',
            text: welcomeText,
          },
        ];
      }
      return prev;
    });
  }, [welcomeText]);

  const updateMessage = (id, next) => {
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));
  };

  const askAssistant = async (text) => {
    const message = String(text || '').trim();
    if (!message || isLoading) return;

    // Local Regex extraction heuristics
    const localExtracted = {};
    const updates = [];

    // 1. Phone number (10-digit number sequence)
    const phoneMatch = message.match(/\b\d{10}\b/);
    if (phoneMatch && onUpdateField) {
      onUpdateField('phone', phoneMatch[0]);
      localExtracted.phone = phoneMatch[0];
      updates.push(`WhatsApp/Contact: ${phoneMatch[0]}`);
    }

    // 2. Pricing unit (Hourly, Monthly, Daily, Fixed)
    const msgLower = message.toLowerCase();
    let localPricingType = '';
    if (msgLower.includes('hour') || msgLower.includes('ghante') || msgLower.includes('per hour') || msgLower.includes('/hr')) {
      localPricingType = 'hourly';
    } else if (msgLower.includes('month') || msgLower.includes('mahina') || msgLower.includes('monthly') || msgLower.includes('/mo')) {
      localPricingType = 'monthly';
    } else if (msgLower.includes('day') || msgLower.includes('din') || msgLower.includes('daily') || msgLower.includes('/day')) {
      localPricingType = 'daily';
    } else if (msgLower.includes('fixed')) {
      localPricingType = 'fixed';
    }
    if (localPricingType && onUpdateField) {
      onUpdateField('pricingType', localPricingType);
      localExtracted.pricingType = localPricingType;
      updates.push(`Pricing Unit: per ${localPricingType}`);
    }

    // 3. Pricing rate (3-6 digits that are not the 10-digit phone number)
    const numbers = message.match(/\b\d{3,6}\b/g);
    if (numbers && (!phoneMatch || numbers.every(num => !phoneMatch[0].includes(num)))) {
      const rate = numbers[0];
      if (rate && onUpdateField) {
        onUpdateField('pricing', rate);
        localExtracted.pricing = rate;
        updates.push(`Payout Rate: ₹${rate}`);
      }
    }

    // 4. Name (My name is ..., I am ..., name ... hai, etc.)
    let nameMatch = message.match(/(?:my name is|i am|this is)\s+([a-zA-Z]{3,15}(?:\s+[a-zA-Z]{3,15}){1,2})/i);
    if (!nameMatch) nameMatch = message.match(/(?:naam|name)\s+([a-zA-Z]{3,15}(?:\s+[a-zA-Z]{3,15}){1,2})\s+(?:hai|hu|hoon)/i);
    if (!nameMatch) nameMatch = message.match(/\b([a-zA-Z]{3,15}(?:\s+[a-zA-Z]{3,15}){1,2})\s+here\b/i);
    if (nameMatch && onUpdateField) {
      const parsedName = nameMatch[1].trim();
      onUpdateField('name', parsedName);
      onUpdateField('profileName', parsedName);
      localExtracted.name = parsedName;
      updates.push(`Full Name: ${parsedName}`);
    }

    // 5. Experience (X years, Y months, X saal, etc.)
    const expYearsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:saal|sal|year|years|yr|yrs)\b/i);
    const expMonthsMatch = message.match(/(\d+)\s*(?:mahina|mahine|month|months|mo|mos)\b/i);
    let parsedExperience = null;
    if (expYearsMatch) {
      parsedExperience = `${expYearsMatch[1]} years`;
    } else if (expMonthsMatch) {
      parsedExperience = `${expMonthsMatch[1]} months`;
    }
    if (parsedExperience && onUpdateField) {
      onUpdateField('experience', parsedExperience);
      localExtracted.experience = parsedExperience;
      updates.push(`Experience: ${parsedExperience}`);
    }

    // 6. Skills extraction (checking ALL_SKILLS from imported list)
    const localSkills = [];
    ALL_SKILLS.forEach(skill => {
      let keyword = skill.toLowerCase();
      if (keyword === 'cctv installer') {
        if (msgLower.includes('cctv')) {
          localSkills.push(skill);
        }
      } else if (keyword === 'ac technician') {
        if (/\bac\b/i.test(msgLower) || msgLower.includes('ac technician')) {
          localSkills.push(skill);
        }
      } else {
        if (msgLower.includes(keyword)) {
          localSkills.push(skill);
        }
      }
    });
    if (localSkills.length > 0 && onUpdateField) {
      onUpdateField('skills', localSkills);
      localExtracted.skills = localSkills;
      updates.push(`Specialities / Skills: ${localSkills.join(', ')}`);
    }

    const userMessageId = makeId('user');
    const loadingId = makeId('loading');

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, author: 'user', text: message },
      { id: loadingId, author: 'assistant', text: 'Thinking...', status: 'loading' },
    ]);
    setInput('');
    setIsLoading(true);

    const payload = {
      message,
      providerId: user?._id,
      profileContext,
      recentMessages,
      conversationId,
    };

    if (isDev) {
      console.log('[ProviderAIChat] sending message', { message });
      console.log('[ProviderAIChat] request payload', payload);
    }

    try {
      const { data } = await sendChatMessage(payload);
      const responseData = data?.data || {};

      if (isDev) {
        console.log('[ProviderAIChat] response payload', data);
      }

      const extracted = responseData.extracted || {};
      if (extracted.city && onUpdateField) {
        onUpdateField('city', extracted.city);
        updates.push(`Location/City: ${extracted.city}`);
      }
      if (extracted.skill && onUpdateField) {
        onUpdateField('skills', [extracted.skill]);
        updates.push(`Speciality/Skill: ${extracted.skill}`);
      }
      if (extracted.budget && !localExtracted.pricing && onUpdateField) {
        const cleanBudget = extracted.budget.replace(/[^\d]/g, '');
        if (cleanBudget) {
          onUpdateField('pricing', cleanBudget);
          updates.push(`Payout Rate: ₹${cleanBudget}`);
        }
      }
      // AI extracts complete fields
      if (extracted.name && onUpdateField) {
        onUpdateField('name', extracted.name);
        onUpdateField('profileName', extracted.name);
        updates.push(`Full Name: ${extracted.name}`);
      }
      if (extracted.tier && onUpdateField) {
        onUpdateField('tier', extracted.tier);
        updates.push(`Skill Tier: ${extracted.tier}`);
      }
      if (extracted.experience && onUpdateField) {
        onUpdateField('experience', extracted.experience);
        updates.push(`Experience: ${extracted.experience}`);
      }
      if (extracted.phone && onUpdateField) {
        onUpdateField('phone', extracted.phone);
        updates.push(`WhatsApp Phone: ${extracted.phone}`);
      }
      if (extracted.pricingType && onUpdateField) {
        onUpdateField('pricingType', extracted.pricingType);
        updates.push(`Pricing Unit: per ${extracted.pricingType}`);
      }
      if (extracted.description && onUpdateField) {
        onUpdateField('description', extracted.description);
        updates.push(`Description: ${extracted.description.slice(0, 40)}...`);
      }
      if (Array.isArray(extracted.languages) && extracted.languages.length > 0 && onUpdateField) {
        onUpdateField('languages', extracted.languages);
        updates.push(`Languages: ${extracted.languages.join(', ')}`);
      }

      let assistantReply = responseData.reply || 'Assistant reply unavailable.';
      if (updates.length > 0) {
        assistantReply = `✅ **Maine aapki profile update kar di hai!**\n` +
          updates.map((u) => `- ${u}`).join('\n') +
          `\n\n` + assistantReply;
      }

      // Calculate remaining missing fields dynamically
      const updatedFieldsList = [];
      if (extracted.city) updatedFieldsList.push('Location / City');
      if (extracted.skill) updatedFieldsList.push('Speciality / Skill');
      if (localExtracted.phone || extracted.phone) updatedFieldsList.push('WhatsApp / Contact Number');
      if (localExtracted.pricing || extracted.pricing || (extracted.budget && extracted.budget.replace(/[^\d]/g, ''))) {
        updatedFieldsList.push('Payout / Pricing Rate');
      }
      if (localExtracted.pricingType || extracted.pricingType) {
        updatedFieldsList.push('Pricing Unit');
      }
      if (extracted.tier) {
        updatedFieldsList.push('Skill Tier');
      }

      const remainingMissing = missingFields.filter((field) => {
        if (field.includes('Location') && updatedFieldsList.includes('Location / City')) return false;
        if (field.includes('Speciality') && updatedFieldsList.includes('Speciality / Skill')) return false;
        if (field.includes('WhatsApp') && updatedFieldsList.includes('WhatsApp / Contact Number')) return false;
        if (field.includes('Payout') && updatedFieldsList.includes('Payout / Pricing Rate')) return false;
        if (field.includes('Pricing Unit') && updatedFieldsList.includes('Pricing Unit')) return false;
        if (field.includes('Skill Tier') && updatedFieldsList.includes('Skill Tier')) return false;
        return true;
      });

      if (remainingMissing.length > 0) {
        assistantReply += `\n\nAb please apna next missing detail **${remainingMissing[0]}** bataiye?`;
      } else if (missingFields.length > 0) {
        assistantReply += `\n\n🎉 **Shabash! Aapki sabhi mandatory details fill ho chuki hain.** Profile ko submit karne ke liye niche scroll karein aur **Save Profile** button pe click karein.`;
      }

      updateMessage(loadingId, {
        text: assistantReply,
        status: 'sent',
      });

      if (responseData.conversationId) {
        setConversationId(String(responseData.conversationId));
      }

      setDebugState({
        lastApiStatus: 'success',
        lastIntent: responseData.detectedIntent || '',
        lastSkill: responseData.extracted?.skill || '',
        lastCity: responseData.extracted?.city || '',
        usedLLM: Boolean(responseData.debug?.usedLLM),
        fallbackReason: responseData.debug?.fallbackReason || '',
      });
    } catch (error) {
      if (isDev) {
        console.error('[ProviderAIChat] API error', error);
      }

      updateMessage(loadingId, {
        text: error?.response?.data?.message || 'Assistant unavailable. Please try again.',
        status: 'error',
      });

      setDebugState((prev) => ({
        ...prev,
        lastApiStatus: 'error',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="w-full bg-transparent font-sans flex flex-col md:flex-row gap-6 items-center justify-between h-full">
        {/* Left Side: Header and Tips */}
        <div className="flex-1 text-left flex flex-col justify-center h-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <p className="text-base font-black text-slate-800 tracking-tight">{t("AI Profile Enhancer")}</p>
            {missingFields.length > 0 && (
              <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-100 shrink-0">
                {missingFields.length}{t("left")}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">{t(
            "Fill your profile in 1-Click via Resume ✨ Upload a resume and our OCR-powered AI assistant will auto-fill your profile details instantly!"
          )}</p>
          <div className="mt-3 flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>{t("Supported:")}</span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-slate-500">{t("PDF")}</span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-slate-500">{t("DOCX")}</span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-slate-500">{t("Images")}</span>
          </div>
        </div>
        {/* Right Side: Compact Dropzone */}
        <div className="w-full md:w-[45%] h-[100px] rounded-2xl bg-indigo-50/20 border-2 border-dashed border-indigo-200/60 flex flex-col items-center justify-center p-3 text-center transition hover:bg-indigo-50/40 relative overflow-hidden shrink-0">
          {resumeLoading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-7 h-7 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
              <p className="text-xs font-extrabold text-indigo-700 capitalize animate-pulse">
                {resumeLoadingState === 'uploading' && 'Uploading resume...'}
                {resumeLoadingState === 'extracting text' && 'OCR extracting text...'}
                {resumeLoadingState === 'analyzing' && 'AI parsing & analyzing...'}
                {!resumeLoadingState && 'Processing...'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t("Please keep open")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full">
              {/* <div className="w-8 h-8 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-1.5 shadow-sm">
                📄
              </div> */}
              <p className="text-xs font-black text-slate-800 leading-tight">{t("Drop or Select Resume")}</p>
              
              {/* Resume Improvement Usage Badge */}
              {(() => {
                const limit = aiUsage?.limits?.resumeImprovement;
                const used = aiUsage?.usage?.resumeImprovement || 0;
                if (limit === undefined || limit === null) return null;
                const isUnlimited = limit === 99999 || limit === -1;
                const remaining = isUnlimited ? '∞' : Math.max(0, limit - used);
                const isExhausted = !isUnlimited && remaining === 0;
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 border ${
                    isExhausted
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : isUnlimited
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isExhausted ? 'bg-red-500' : 'bg-indigo-500'}`} />
                    {isUnlimited ? 'Unlimited Uploads' : isExhausted ? 'Limit Reached' : `${remaining} Upload${remaining !== 1 ? 's' : ''} Left`}
                  </span>
                );
              })()}
              
              {profileContext?.resumeApproval?.status === 'pending' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase mt-1 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{t("Pending Approval")}</span>
              )}

              {profileContext?.resumeApproval?.status === 'rejected' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase mt-1 border border-red-200" title={profileContext?.resumeApproval?.rejectionReason}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{t("Rejected")}</span>
              )}
              
              {resumeError && (
                <p className="mt-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 leading-normal max-w-full truncate animate-fadeIn" title={resumeError}>
                  ⚠️ {resumeError}
                </p>
              )}

              <input
                type="file"
                id="resume-file-input"
                className="hidden"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
                onChange={handleResumeUpload}
              />
              <button
                type="button"
                onClick={() => document.getElementById('resume-file-input').click()}
                className="mt-2.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm hover:shadow-indigo-200"
              >{t("Select File")}</button>
            </div>
          )}
        </div>
        {/* 9. Editable Resume Preview Modal */}
        {parsedPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-zoomIn">
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">{t("Review AI Extracted Details")}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{t(
                      "Please review and edit details extracted from your resume before applying."
                    )}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setParsedPreview(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left font-sans">
                {/* Name & Phone Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Full Name")}</label>
                    <input
                      type="text"
                      value={parsedPreview.fullName || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("WhatsApp / Contact Number")}</label>
                    <input
                      type="text"
                      value={parsedPreview.contactNumber || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, contactNumber: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Professional Bio")}</label>
                  <textarea
                    value={parsedPreview.bio || ''}
                    onChange={(e) => setParsedPreview({ ...parsedPreview, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition resize-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Skills */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Skills (Comma-separated)")}</label>
                    <input
                      type="text"
                      value={Array.isArray(parsedPreview.skills) ? parsedPreview.skills.join(', ') : parsedPreview.skills || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* Specialities */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Specialities (Comma-separated)")}</label>
                    <input
                      type="text"
                      value={Array.isArray(parsedPreview.specialities) ? parsedPreview.specialities.join(', ') : parsedPreview.specialities || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, specialities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>
                </div>

                {(!user?.currentPlan || String(user.currentPlan).toLowerCase() === 'free' || String(user.currentPlan).toLowerCase() === 'provider-free-default') && (
                  <div className="text-[10px] text-amber-800 bg-red-50/90 px-3 py-2 rounded-xl border border-red-200/40 font-bold max-w-full text-center">
                    <span>{t("⚡ select only one skill and for all skills upgrade plan")}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("City")}</label>
                    <input
                      type="text"
                      value={parsedPreview.city || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, city: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* Service Locations */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Service Locations (Comma-separated)")}</label>
                    <input
                      type="text"
                      value={Array.isArray(parsedPreview.serviceLocations) ? parsedPreview.serviceLocations.join(', ') : parsedPreview.serviceLocations || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, serviceLocations: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Smart Skill Level */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Smart Skill Level (AI Recommended)")}</label>
                    <div className="relative">
                      <select
                        value={parsedPreview.skillLevel || 'unskilled'}
                        onChange={(e) => setParsedPreview({ ...parsedPreview, skillLevel: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition appearance-none shadow-inner"
                      >
                        <option value="unskilled">{t("Unskilled")}</option>
                        <option value="semi_skilled">{t("Semi Skilled")}</option>
                        <option value="skilled">{t("Skilled")}</option>
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Experience Years */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Experience Years")}</label>
                    <input
                      type="text"
                      value={parsedPreview.experienceYears || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, experienceYears: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Service Category")}</label>
                    <input
                      type="text"
                      value={parsedPreview.serviceCategory || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, serviceCategory: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* Availability */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Availability")}</label>
                    <input
                      type="text"
                      value={parsedPreview.availability || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, availability: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pricing */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Payout Amount (₹)")}</label>
                    <input
                      type="text"
                      value={parsedPreview.pricing || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, pricing: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* Pricing Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Pricing Unit")}</label>
                    <div className="relative">
                      <select
                        value={parsedPreview.pricingType || 'hourly'}
                        onChange={(e) => setParsedPreview({ ...parsedPreview, pricingType: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition appearance-none shadow-inner"
                      >
                        <option value="hourly">{t("Hourly")}</option>
                        <option value="daily">{t("Daily")}</option>
                        <option value="monthly">{t("Monthly")}</option>
                        <option value="fixed">{t("Fixed")}</option>
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Languages */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("Languages (Comma-separated)")}</label>
                    <input
                      type="text"
                      value={Array.isArray(parsedPreview.languages) ? parsedPreview.languages.join(', ') : parsedPreview.languages || ''}
                      onChange={(e) => setParsedPreview({ ...parsedPreview, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 transition shadow-inner"
                    />
                  </div>

                  {/* WhatsApp Alerts */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 shadow-inner">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">{t("WhatsApp Alerts")}</label>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t("Receive job matches on WhatsApp")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParsedPreview({ ...parsedPreview, whatsappAlerts: !parsedPreview.whatsappAlerts })}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 outline-none ${parsedPreview.whatsappAlerts ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${parsedPreview.whatsappAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Portfolio Links Section */}
                <div className="border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🌐</span>{t("Portfolio & Social Links")}</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextLinks = [...(parsedPreview.portfolioLinks || [])];
                        nextLinks.push({ platform: 'Personal Website', url: '', status: 'pending', isPublic: false });
                        setParsedPreview({ ...parsedPreview, portfolioLinks: nextLinks });
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                    >
                      <span>➕</span>{t("Add Link")}</button>
                  </div>
                  {(!parsedPreview.portfolioLinks || parsedPreview.portfolioLinks.length === 0) ? (
                    <p className="text-xs text-slate-400 font-medium italic py-3 bg-slate-50/50 rounded-xl text-center border border-dashed border-slate-200">{t(
                      "No portfolio links extracted. Click \"Add Link\" to add your websites or social profiles."
                    )}</p>
                  ) : (
                    <div className="space-y-3">
                      {parsedPreview.portfolioLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 shadow-inner">
                          <div className="w-1/3 relative">
                            <select
                              value={link.platform}
                              onChange={(e) => {
                                const nextLinks = [...parsedPreview.portfolioLinks];
                                nextLinks[idx].platform = e.target.value;
                                setParsedPreview({ ...parsedPreview, portfolioLinks: nextLinks });
                              }}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 bg-white outline-none"
                            >
                              <option value="LinkedIn">{t("LinkedIn")}</option>
                              <option value="GitHub">{t("GitHub")}</option>
                              <option value="Behance">{t("Behance")}</option>
                              <option value="Dribbble">{t("Dribbble")}</option>
                              <option value="Instagram">{t("Instagram")}</option>
                              <option value="Facebook">{t("Facebook")}</option>
                              <option value="Personal Website">{t("Personal Website")}</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => {
                              const nextLinks = [...parsedPreview.portfolioLinks];
                              nextLinks[idx].url = e.target.value;
                              setParsedPreview({ ...parsedPreview, portfolioLinks: nextLinks });
                            }}
                            placeholder={t("URL (e.g. https://github.com/username)")}
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-indigo-500 bg-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextLinks = parsedPreview.portfolioLinks.filter((_, i) => i !== idx);
                              setParsedPreview({ ...parsedPreview, portfolioLinks: nextLinks });
                            }}
                            className="p-2 text-red-700 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remove Link"
                          >
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setParsedPreview(null)}
                  className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold transition-all active:scale-95"
                >{t("Cancel")}</button>
                <button
                  type="button"
                  onClick={applyResumeChanges}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-200"
                >{t("Apply Changes to Draft")}</button>
              </div>
            </div>
          </div>
        )}
        {/* <div ref={listRef} className="p-4 h-64 overflow-y-auto space-y-3 bg-slate-50/50 rounded-2xl mb-4 border border-slate-100/50">
          {messages.map((item) => (
            <div key={item.id} className={`flex ${item.author === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${
                  item.author === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                    : item.status === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => askAssistant(text)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 transition-all font-semibold disabled:opacity-60 shadow-xs"
              >
                {text}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askAssistant(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., main AC mechanic hu Delhi me, 3 saal ka experience hai..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 shrink-0"
            >
              Send
            </button>
          </form>
        </div> */}
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{t("Provider AI Assistant")}</p>
              <p className="text-[11px] text-gray-300">{t("Context-aware AI chat")}</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-gray-300 hover:text-white">{t("Close")}</button>
          </div>

          <div ref={listRef} className="p-3 h-96 overflow-y-auto space-y-2 bg-gray-50">
            {messages.map((item) => (
              <div key={item.id} className={`flex ${item.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    item.author === 'user'
                      ? 'bg-blue-600 text-white'
                      : item.status === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_CHIPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => askAssistant(text)}
                  disabled={isLoading}
                  className="text-[11px] px-2 py-1 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60"
                >
                  {text}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askAssistant(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("Ask assistant...")}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >{t("Send")}</button>
            </form>

            {isDev ? <ProviderAIDebugPanel debugState={debugState} /> : null}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
      >{t("AI Chat")}</button>
    </div>
  );
}
