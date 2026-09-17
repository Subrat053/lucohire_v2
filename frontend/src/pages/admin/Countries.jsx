import { useState, useEffect } from 'react';
import { 
  HiPlus, HiPencil, HiTrash, HiX, HiCheck, HiShieldCheck, HiRefresh,
  HiPlay, HiPause, HiStop, HiSearch, HiFilter, HiInformationCircle, 
  HiChevronDown, HiChevronUp, HiGlobeAlt, HiSparkles, HiLightningBolt
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyCountry = {
  countryCode: '',
  countryName: '',
  currency: '',
  currencySymbol: '',
  phoneCode: '',
  timezone: '',
  defaultTaxName: 'GST',
  defaultTaxPercent: 0,
  supportedJobSources: [],
  supportedAtsSources: [],
  defaultLanguage: 'en',
  allowedLanguages: ['en'],
  salaryFormat: {
    type: 'monthly',
    minSalary: 0,
    maxSalary: 0
  },
  jobTypes: ['full_time', 'part_time', 'remote'],
  categories: ['IT & Software', 'Marketing', 'Sales'],
  skills: ['react', 'node', 'javascript'],
  seoRules: {
    generateCountryPages: false,
    generateCityPages: false,
    generateSkillPages: false,
    generateCategoryPages: false,
    minimumJobsForSeoPage: 10
  },
  notificationRules: {
    dailyDigestEnabled: false,
    jobAlertEnabled: false,
    whatsappEnabled: false,
    smsEnabled: false,
    emailEnabled: false
  },
  pricingRules: {
    providerPlansEnabled: false,
    recruiterPlansEnabled: false,
    defaultCurrency: 'USD',
    taxName: 'GST',
    taxPercentage: 0
  },
  syncRules: {
    dailySyncEnabled: false,
    syncFrequencyHours: 24,
    maxJobsPerSource: 500,
    maxPagesPerSource: 5,
    inactiveJobRetentionDays: 30
  },
  isActive: false,
  isJobSyncEnabled: false
};

const JOB_SOURCES_OPTIONS = ['adzuna', 'jooble', 'usajobs', 'themuse', 'arbeitnow', 'remoteok', 'remotive'];
const ATS_SOURCES_OPTIONS = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'];
const JOB_TYPES_OPTIONS = ['full_time', 'part_time', 'remote', 'internship'];

const ALL_TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone').map(tz => ({
      value: tz,
      label: tz
    }));
  } catch (e) {
    return [
      { value: 'UTC', label: 'UTC (GMT)' },
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India Standard Time)' },
      { value: 'America/New_York', label: 'America/New_York (US Eastern Time)' },
      { value: 'America/Chicago', label: 'America/Chicago (US Central Time)' },
      { value: 'America/Denver', label: 'America/Denver (US Mountain Time)' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (US Pacific Time)' },
      { value: 'Europe/London', label: 'Europe/London (UK Standard Time)' },
      { value: 'America/Toronto', label: 'America/Toronto (Canada Eastern Time)' },
      { value: 'America/Vancouver', label: 'America/Vancouver (Canada Pacific Time)' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time)' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney (Australia Eastern Time)' },
      { value: 'Australia/Perth', label: 'Australia/Perth (Australia Western Time)' }
    ];
  }
})();

const ALL_COUNTRIES_DIAL_CODES = [
  { name: "Afghanistan", code: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "Andorra", code: "+376", flag: "🇦🇩" },
  { name: "Angola", code: "+244", flag: "🇦🇴" },
  { name: "Antigua and Barbuda", code: "+1", flag: "🇦🇬" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "Armenia", code: "+374", flag: "🇦🇲" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "Azerbaijan", code: "+994", flag: "🇦🇿" },
  { name: "Bahamas", code: "+1", flag: "🇧🇸" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Barbados", code: "+1", flag: "🇧🇧" },
  { name: "Belarus", code: "+375", flag: "🇧🇾" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Belize", code: "+501", flag: "🇧🇿" },
  { name: "Benin", code: "+229", flag: "🇧🇯" },
  { name: "Bhutan", code: "+975", flag: "🇧🇹" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", code: "+387", flag: "🇧🇦" },
  { name: "Botswana", code: "+267", flag: "🇧🇼" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Brunei", code: "+673", flag: "🇧🇳" },
  { name: "Bulgaria", code: "+359", flag: "🇧🇬" },
  { name: "Burkina Faso", code: "+226", flag: "🇧🇫" },
  { name: "Burundi", code: "+257", flag: "🇧🇮" },
  { name: "Cambodia", code: "+855", flag: "🇰🇭" },
  { name: "Cameroon", code: "+237", flag: "🇨🇲" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Cape Verde", code: "+238", flag: "🇨🇻" },
  { name: "Central African Republic", code: "+236", flag: "🇨🇫" },
  { name: "Chad", code: "+235", flag: "🇹🇩" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Comoros", code: "+269", flag: "🇰🇲" },
  { name: "Congo", code: "+242", flag: "🇨🇬" },
  { name: "Costa Rica", code: "+506", flag: "🇨🇷" },
  { name: "Croatia", code: "+385", flag: "🇭🇷" },
  { name: "Cuba", code: "+53", flag: "🇨🇺" },
  { name: "Cyprus", code: "+357", flag: "🇨🇾" },
  { name: "Czech Republic", code: "+420", flag: "🇨🇿" },
  { name: "Denmark", code: "+45", flag: "🇩🇰" },
  { name: "Djibouti", code: "+253", flag: "🇩🇯" },
  { name: "Dominica", code: "+1", flag: "🇩🇲" },
  { name: "Dominican Republic", code: "+1", flag: "🇩🇴" },
  { name: "East Timor", code: "+670", flag: "🇹🇱" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "El Salvador", code: "+503", flag: "🇸🇻" },
  { name: "Equatorial Guinea", code: "+240", flag: "🇬🇶" },
  { name: "Eritrea", code: "+291", flag: "🇪🇷" },
  { name: "Estonia", code: "+372", flag: "🇪🇪" },
  { name: "Ethiopia", code: "+251", flag: "🇪🇹" },
  { name: "Fiji", code: "+679", flag: "🇫🇯" },
  { name: "Finland", code: "+358", flag: "🇫🇮" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Gabon", code: "+241", flag: "🇬🇦" },
  { name: "Gambia", code: "+220", flag: "🇬🇲" },
  { name: "Georgia", code: "+995", flag: "🇬🇪" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "Ghana", code: "+233", flag: "🇬🇭" },
  { name: "Greece", code: "+30", flag: "🇬🇷" },
  { name: "Grenada", code: "+1", flag: "🇬🇩" },
  { name: "Guatemala", code: "+502", flag: "🇬🇹" },
  { name: "Guinea", code: "+224", flag: "🇬🇳" },
  { name: "Guinea-Bissau", code: "+245", flag: "🇬🇼" },
  { name: "Guyana", code: "+592", flag: "🇬🇾" },
  { name: "Haiti", code: "+509", flag: "🇭🇹" },
  { name: "Honduras", code: "+504", flag: "🇭🇳" },
  { name: "Hungary", code: "+36", flag: "🇭🇺" },
  { name: "Iceland", code: "+354", flag: "🇮🇸" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "+353", flag: "🇮🇪" },
  { name: "Israel", code: "+972", flag: "🇮🇱" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Ivory Coast", code: "+225", flag: "🇨🇮" },
  { name: "Jamaica", code: "+1", flag: "🇯🇲" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "Jordan", code: "+962", flag: "🇯🇴" },
  { name: "Kazakhstan", code: "+7", flag: "🇰🇿" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Kiribati", code: "+686", flag: "🇰🇮" },
  { name: "Kosovo", code: "+383", flag: "🇽🇰" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "+996", flag: "🇰🇬" },
  { name: "Laos", code: "+856", flag: "🇱🇦" },
  { name: "Latvia", code: "+371", flag: "🇱🇻" },
  { name: "Lebanon", code: "+961", flag: "🇱🇧" },
  { name: "Lesotho", code: "+266", flag: "🇱🇸" },
  { name: "Liberia", code: "+231", flag: "🇱🇷" },
  { name: "Libya", code: "+218", flag: "🇱🇾" },
  { name: "Liechtenstein", code: "+423", flag: "🇱🇮" },
  { name: "Lithuania", code: "+370", flag: "🇱🇹" },
  { name: "Luxembourg", code: "+352", flag: "🇱🇺" },
  { name: "Macedonia", code: "+389", flag: "🇲🇰" },
  { name: "Madagascar", code: "+261", flag: "🇲🇬" },
  { name: "Malawi", code: "+265", flag: "🇲🇼" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "+960", flag: "🇲🇻" },
  { name: "Mali", code: "+223", flag: "🇲🇱" },
  { name: "Malta", code: "+356", flag: "🇲🇹" },
  { name: "Marshall Islands", code: "+692", flag: "🇲🇭" },
  { name: "Mauritania", code: "+222", flag: "🇲🇷" },
  { name: "Mauritius", code: "+230", flag: "🇲🇺" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Micronesia", code: "+691", flag: "🇫🇲" },
  { name: "Moldova", code: "+373", flag: "🇲🇩" },
  { name: "Monaco", code: "+377", flag: "🇲🇨" },
  { name: "Mongolia", code: "+976", flag: "🇲🇳" },
  { name: "Montenegro", code: "+382", flag: "🇲🇪" },
  { name: "Morocco", code: "+212", flag: "🇲🇦" },
  { name: "Mozambique", code: "+258", flag: "🇲🇿" },
  { name: "Myanmar", code: "+95", flag: "🇲🇲" },
  { name: "Namibia", code: "+264", flag: "🇳🇦" },
  { name: "Nauru", code: "+674", flag: "🇳🇷" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Nicaragua", code: "+505", flag: "🇳🇮" },
  { name: "Niger", code: "+227", flag: "🇳🇪" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "North Korea", code: "+850", flag: "🇰🇵" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Palau", code: "+680", flag: "🇵🇼" },
  { name: "Palestine", code: "+970", flag: "🇵🇸" },
  { name: "Panama", code: "+507", flag: "🇵🇦" },
  { name: "Papua New Guinea", code: "+675", flag: "🇵🇬" },
  { name: "Paraguay", code: "+595", flag: "🇵🇾" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Romania", code: "+40", flag: "🇷🇴" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Rwanda", code: "+250", flag: "🇷🇼" },
  { name: "Saint Kitts and Nevis", code: "+1", flag: "🇰🇳" },
  { name: "Saint Lucia", code: "+1", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", code: "+1", flag: "🇻🇨" },
  { name: "Samoa", code: "+685", flag: "🇼🇸" },
  { name: "San Marino", code: "+378", flag: "🇸🇲" },
  { name: "Sao Tome and Principe", code: "+239", flag: "🇸🇹" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Senegal", code: "+221", flag: "🇸🇳" },
  { name: "Serbia", code: "+381", flag: "🇷🇸" },
  { name: "Seychelles", code: "+248", flag: "🇸🇨" },
  { name: "Sierra Leone", code: "+232", flag: "🇸🇱" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Slovakia", code: "+421", flag: "🇸🇰" },
  { name: "Slovenia", code: "+386", flag: "🇸🇮" },
  { name: "Solomon Islands", code: "+677", flag: "🇸🇧" },
  { name: "Somalia", code: "+252", flag: "🇸🇴" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "South Sudan", code: "+211", flag: "🇸🇸" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Sudan", code: "+249", flag: "🇸🇩" },
  { name: "Suriname", code: "+597", flag: "🇸🇷" },
  { name: "Swaziland", code: "+268", flag: "🇸🇿" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "+963", flag: "🇸🇾" },
  { name: "Taiwan", code: "+886", flag: "🇹🇼" },
  { name: "Tajikistan", code: "+992", flag: "🇹🇯" },
  { name: "Tanzania", code: "+255", flag: "🇹🇿" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Togo", code: "+228", flag: "🇹🇬" },
  { name: "Tonga", code: "+676", flag: "🇹🇴" },
  { name: "Trinidad and Tobago", code: "+1", flag: "🇹🇹" },
  { name: "Tunisia", code: "+216", flag: "🇹🇳" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Turkmenistan", code: "+993", flag: "🇹🇲" },
  { name: "Tuvalu", code: "+688", flag: "🇹🇻" },
  { name: "Uganda", code: "+256", flag: "🇺🇬" },
  { name: "Ukraine", code: "+380", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "Uruguay", code: "+598", flag: "🇺🇾" },
  { name: "Uzbekistan", code: "+998", flag: "🇺🇿" },
  { name: "Vanuatu", code: "+678", flag: "🇻🇺" },
  { name: "Vatican City", code: "+379", flag: "🇻🇦" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Yemen", code: "+967", flag: "🇾🇪" },
  { name: "Zambia", code: "+260", flag: "🇿🇲" },
  { name: "Zimbabwe", code: "+263", flag: "🇿🇼" }
];

const AdminCountries = () => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [form, setForm] = useState({ ...emptyCountry });
  const [activeTab, setActiveTab] = useState('general');
  const [deleteModal, setDeleteModal] = useState({ open: false, countryId: null, countryName: '' });
  const [validationResult, setValidationResult] = useState(null);
  const [categoriesText, setCategoriesText] = useState('');
  const [skillsText, setSkillsText] = useState('');

  // Filters & Search State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | live | inactive | incomplete
  const [syncFilter, setSyncFilter] = useState('all'); // all | running | paused | stopped
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const { data } = await adminAPI.getCountries();
      setCountries(data?.countries || []);
    } catch (err) {
      toast.error('Failed to load country configurations');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingCountry(null);
    setForm({ ...emptyCountry });
    setCategoriesText('');
    setSkillsText('');
    setActiveTab('general');
    setValidationResult(null);
    setShowForm(true);
  };

  const openEdit = (country) => {
    setEditingCountry(country);
    setCategoriesText(country.categories ? country.categories.join(', ') : '');
    setSkillsText(country.skills ? country.skills.join(', ') : '');
    setForm({
      countryCode: country.countryCode || '',
      countryName: country.countryName || '',
      currency: country.currency || '',
      currencySymbol: country.currencySymbol || '',
      phoneCode: country.phoneCode || '',
      timezone: country.timezone || '',
      defaultTaxName: country.defaultTaxName || 'GST',
      defaultTaxPercent: country.defaultTaxPercent || 0,
      supportedJobSources: country.supportedJobSources || [],
      supportedAtsSources: country.supportedAtsSources || [],
      defaultLanguage: country.defaultLanguage || 'en',
      allowedLanguages: country.allowedLanguages || ['en'],
      salaryFormat: country.salaryFormat || { type: 'monthly', minSalary: 0, maxSalary: 0 },
      jobTypes: country.jobTypes || ['full_time', 'part_time', 'remote'],
      categories: country.categories || [],
      skills: country.skills || [],
      seoRules: country.seoRules || { generateCountryPages: false, generateCityPages: false, generateSkillPages: false, generateCategoryPages: false, minimumJobsForSeoPage: 10 },
      notificationRules: country.notificationRules || { dailyDigestEnabled: false, jobAlertEnabled: false, whatsappEnabled: false, smsEnabled: false, emailEnabled: false },
      pricingRules: country.pricingRules || { providerPlansEnabled: false, recruiterPlansEnabled: false, defaultCurrency: 'USD', taxName: 'GST', taxPercentage: 0 },
      syncRules: country.syncRules || { dailySyncEnabled: false, syncFrequencyHours: 24, maxJobsPerSource: 500, maxPagesPerSource: 5, inactiveJobRetentionDays: 30 },
      isActive: country.isActive || false,
      isJobSyncEnabled: country.isJobSyncEnabled || false
    });
    setValidationResult(null);
    setActiveTab('general');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.countryCode || form.countryCode.trim().length !== 2) {
      toast.error('Country Code must be a 2-letter code (e.g. IN, US, AE)');
      return;
    }

    const payload = {
      ...form,
      categories: categoriesText.split(',').map(s => s.trim()).filter(Boolean),
      skills: skillsText.split(',').map(s => s.trim()).filter(Boolean),
      countryCode: form.countryCode.toUpperCase().trim(),
      countryName: form.countryName.trim(),
      currency: form.currency.toUpperCase().trim(),
      currencySymbol: form.currencySymbol.trim(),
      phoneCode: form.phoneCode.trim(),
      timezone: form.timezone.trim(),
      defaultTaxPercent: Number(form.defaultTaxPercent),
      salaryFormat: {
        ...form.salaryFormat,
        minSalary: Number(form.salaryFormat.minSalary),
        maxSalary: Number(form.salaryFormat.maxSalary)
      },
      seoRules: {
        ...form.seoRules,
        minimumJobsForSeoPage: Number(form.seoRules.minimumJobsForSeoPage)
      },
      syncRules: {
        ...form.syncRules,
        syncFrequencyHours: Number(form.syncRules.syncFrequencyHours),
        maxJobsPerSource: Number(form.syncRules.maxJobsPerSource),
        maxPagesPerSource: Number(form.syncRules.maxPagesPerSource),
        inactiveJobRetentionDays: Number(form.syncRules.inactiveJobRetentionDays)
      },
      pricingRules: {
        ...form.pricingRules,
        taxPercentage: Number(form.pricingRules.taxPercentage)
      }
    };

    try {
      if (editingCountry) {
        await adminAPI.updateCountryConfig(editingCountry._id, payload);
        toast.success('Country configuration saved');
      } else {
        await adminAPI.createCountryConfig(payload);
        toast.success('Country configuration created');
      }
      setShowForm(false);
      fetchCountries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    }
  };

  const runValidation = async (id) => {
    try {
      const { data } = await adminAPI.validateCountryConfig(id);
      if (data.isValid) {
        toast.success('Country checklist validation passed!');
      } else {
        toast.error('Checklist incomplete. See validation panel.');
      }
      setValidationResult(data);
      fetchCountries();
    } catch (err) {
      toast.error('Failed to validate country setup');
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminAPI.activateCountryConfig(id);
      toast.success('Country activated and is now LIVE!');
      fetchCountries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate country');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await adminAPI.deactivateCountryConfig(id);
      toast.success('Country deactivated');
      fetchCountries();
    } catch (err) {
      toast.error('Failed to deactivate country');
    }
  };

  const handleStartSync = async (id) => {
    try {
      await adminAPI.startCountrySync(id);
      toast.success('Job ingestion pipeline STARTED');
      fetchCountries();
    } catch (err) {
      toast.error('Failed to start sync pipeline');
    }
  };

  const handlePauseSync = async (id) => {
    try {
      await adminAPI.pauseCountrySync(id);
      toast.success('Job ingestion pipeline PAUSED');
      fetchCountries();
    } catch (err) {
      toast.error('Failed to pause sync pipeline');
    }
  };

  const handleStopSync = async (id) => {
    try {
      await adminAPI.stopCountrySync(id);
      toast.success('Job ingestion pipeline STOPPED');
      fetchCountries();
    } catch (err) {
      toast.error('Failed to stop sync pipeline');
    }
  };

  // Filtered countries logic
  const filteredCountries = countries.filter(country => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      (country.countryName && country.countryName.toLowerCase().includes(q)) ||
      (country.countryCode && country.countryCode.toLowerCase().includes(q)) ||
      (country.currency && country.currency.toLowerCase().includes(q)) ||
      (country.timezone && country.timezone.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'live' && country.isActive) ||
      (statusFilter === 'inactive' && !country.isActive) ||
      (statusFilter === 'incomplete' && country.validationStatus !== 'active');

    const syncState = country.syncRules?.syncState || (country.isJobSyncEnabled ? 'running' : 'stopped');
    const matchesSync =
      syncFilter === 'all' ||
      syncState === syncFilter;

    return matchesSearch && matchesStatus && matchesSync;
  });

  const handleDeleteClick = (country) => {
    setDeleteModal({
      open: true,
      countryId: country._id,
      countryName: country.countryName,
    });
  };

  const confirmDelete = async () => {
    const { countryId } = deleteModal;
    if (!countryId) return;
    try {
      await adminAPI.deleteCountryConfig(countryId);
      toast.success('Country configuration deleted');
      fetchCountries();
    } catch (err) {
      toast.error('Failed to delete country configuration');
    } finally {
      setDeleteModal({ open: false, countryId: null, countryName: '' });
    }
  };

  const toggleMultiSelect = (field, val) => {
    setForm(prev => {
      const list = prev[field] || [];
      const updated = list.includes(val) 
        ? list.filter(item => item !== val) 
        : [...list, val];
      return { ...prev, [field]: updated };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Stats calculation
  const totalCount = countries.length;
  const liveCount = countries.filter(c => c.isActive).length;
  const runningSyncCount = countries.filter(c => c.isJobSyncEnabled && (c.syncRules?.syncState === 'running' || !c.syncRules?.syncState)).length;
  const pausedSyncCount = countries.filter(c => c.syncRules?.syncState === 'paused').length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiGlobeAlt className="w-7 h-7 text-indigo-600" /> Country Configuration & Ingestion Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure regional settings (pricing, currency, taxes, ATS sources) and control multi-country automated job ingestion pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
          >
            <HiInformationCircle className="w-4 h-4 text-indigo-600" />
            {showGuide ? 'Hide Guide' : 'Workflow Guide'}
            {showGuide ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-md shadow-blue-500/10 text-sm"
          >
            <HiPlus className="w-4 h-4" /> Add Country Config
          </button>
        </div>
      </div>

      {/* Purpose & Workflow Banner */}
      {showGuide && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-full border border-indigo-400/30 flex items-center gap-1">
                <HiSparkles className="w-3.5 h-3.5 text-yellow-300" /> Country Engine Lifecycle
              </span>
              <h2 className="text-lg font-bold text-white">How Country Configuration Works</h2>
            </div>
            <button onClick={() => setShowGuide(false)} className="text-indigo-200 hover:text-white transition">
              <HiX className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <div className="font-bold text-indigo-200 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">1</span>
                Regional Setup
              </div>
              <p className="text-indigo-100">Set 2-letter ISO code (e.g. IN, US), currency, timezone, tax rates, and allowed job/ATS sources.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <div className="font-bold text-indigo-200 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">2</span>
                Checklist Validation
              </div>
              <p className="text-indigo-100">Click 🛡️ Check Validation to run automatic completeness tests on pricing, languages, and SEO rules.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <div className="font-bold text-indigo-200 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">3</span>
                Pipeline Controls
              </div>
              <p className="text-indigo-100">Use <strong className="text-emerald-300">▶ Start</strong>, <strong className="text-amber-300">⏸ Pause</strong>, or <strong className="text-red-300">⏹ Stop</strong> to control automated job scraping for that country.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
              <div className="font-bold text-indigo-200 mb-1 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">4</span>
                Market Activation
              </div>
              <p className="text-indigo-100">Toggle <strong className="text-emerald-300">Activate</strong> to open public site search, candidate profiles, and recruiter matching for that country.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Countries</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Markets
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{liveCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <HiLightningBolt className="w-3.5 h-3.5 text-indigo-600" /> Active Sync Pipelines
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{runningSyncCount} <span className="text-xs font-normal text-gray-400">({pausedSyncCount} paused)</span></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Setup</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{totalCount - liveCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <HiSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country, code, currency..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <HiFilter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-44 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Market Statuses</option>
              <option value="live">LIVE Markets</option>
              <option value="inactive">INACTIVE Markets</option>
              <option value="incomplete">Setup Incomplete</option>
            </select>
          </div>

          {/* Ingestion Sync Filter */}
          <select
            value={syncFilter}
            onChange={(e) => setSyncFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Sync Pipelines</option>
            <option value="running">▶ Sync Running</option>
            <option value="paused">⏸ Sync Paused</option>
            <option value="stopped">⏹ Sync Stopped</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(search || statusFilter !== 'all' || syncFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setSyncFilter('all'); }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <HiRefresh className="w-3.5 h-3.5" /> Clear Filters ({filteredCountries.length} shown)
          </button>
        )}
      </div>

      {/* Main Countries Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Currency & TZ</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Checklist Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Job Ingestion Pipeline</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Market Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {filteredCountries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No country configurations match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCountries.map((country) => {
                  const syncState = country.syncRules?.syncState || (country.isJobSyncEnabled ? 'running' : 'stopped');
                  return (
                    <tr key={country._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Country Name & Code */}
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        {country.countryName}{' '}
                        <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold ml-1">
                          {country.countryCode}
                        </span>
                      </td>

                      {/* Currency & Timezone */}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        <div className="font-medium text-gray-900">{country.currency} ({country.currencySymbol || '$'})</div>
                        <div className="text-xs text-gray-400 font-mono">{country.timezone || 'Not set'}</div>
                      </td>

                      {/* Checklist Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            country.validationStatus === 'active'
                              ? 'bg-green-50 text-green-700'
                              : country.validationStatus === 'draft'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {country.validationStatus || 'setup_incomplete'}
                        </span>
                      </td>

                      {/* Job Ingestion Pipeline Status & Controls */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          {/* Sync State Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                syncState === 'running'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : syncState === 'paused'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                syncState === 'running' ? 'bg-emerald-500 animate-pulse' : syncState === 'paused' ? 'bg-amber-500' : 'bg-gray-400'
                              }`}></span>
                              {syncState === 'running' ? 'Running' : syncState === 'paused' ? 'Paused' : 'Stopped'}
                            </span>
                          </div>

                          {/* Ingestion Control Buttons: Start, Pause, Stop */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartSync(country._id)}
                              disabled={syncState === 'running'}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
                                syncState === 'running'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                              title="Start job ingestion pipeline"
                            >
                              <HiPlay className="w-3 h-3" /> Start
                            </button>
                            <button
                              onClick={() => handlePauseSync(country._id)}
                              disabled={syncState === 'paused'}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
                                syncState === 'paused'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              }`}
                              title="Pause job ingestion pipeline"
                            >
                              <HiPause className="w-3 h-3" /> Pause
                            </button>
                            <button
                              onClick={() => handleStopSync(country._id)}
                              disabled={syncState === 'stopped'}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition ${
                                syncState === 'stopped'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              }`}
                              title="Stop job ingestion pipeline"
                            >
                              <HiStop className="w-3 h-3" /> Stop
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Market Activation Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            country.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {country.isActive ? 'LIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => runValidation(country._id)}
                            className="p-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg transition"
                            title="Run Setup Validation"
                          >
                            <HiShieldCheck className="w-4.5 h-4.5" />
                          </button>
                          {country.isActive ? (
                            <button
                              onClick={() => handleDeactivate(country._id)}
                              className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(country._id)}
                              className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold transition"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(country)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                            title="Edit Config"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(country)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Delete"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Result Box */}
      {validationResult && (
        <div className={`p-4 rounded-xl mb-6 border ${validationResult.isValid ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          <h4 className="font-bold flex items-center gap-2">
            <HiShieldCheck className="w-5 h-5" /> Validation Status: {validationResult.isValid ? 'Pass' : 'Failed'}
          </h4>
          {!validationResult.isValid && (
            <ul className="list-disc list-inside mt-2 text-xs space-y-1">
              {validationResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {validationResult.isValid && (
            <p className="text-xs mt-1">All criteria met. You can now toggle the active switch to make this country LIVE.</p>
          )}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingCountry ? `Edit Country Setup (${form.countryName})` : 'New Country Control Panel'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50/50 px-4 text-sm">
              {['general', 'sources', 'pricing', 'seo', 'sync'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 font-semibold capitalize border-b-2 transition-all ${
                    activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country Name</label>
                      <input
                        required
                        value={form.countryName}
                        onChange={(e) => setForm(f => ({ ...f, countryName: e.target.value }))}
                        placeholder="e.g. India"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Country Code (2 Letters)</label>
                      <input
                        required
                        maxLength={2}
                        value={form.countryCode}
                        onChange={(e) => setForm(f => ({ ...f, countryCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g. IN"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Currency Code</label>
                      <input
                        required
                        maxLength={3}
                        value={form.currency}
                        onChange={(e) => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                        placeholder="e.g. INR"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Currency Symbol</label>
                      <input
                        required
                        value={form.currencySymbol}
                        onChange={(e) => setForm(f => ({ ...f, currencySymbol: e.target.value }))}
                        placeholder="e.g. ₹"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Dialing Code</label>
                      <select
                        value={form.phoneCode}
                        onChange={(e) => setForm(f => ({ ...f, phoneCode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                      >
                        <option value="">Select Dialing Code...</option>
                        {ALL_COUNTRIES_DIAL_CODES.map((item, idx) => (
                          <option key={`${item.code}-${idx}`} value={item.code}>
                            {item.flag} {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Timezone</label>
                      <select
                        value={form.timezone}
                        onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                      >
                        <option value="">Select Timezone...</option>
                        {ALL_TIMEZONES.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Default Language</label>
                      <input
                        value={form.defaultLanguage}
                        onChange={(e) => setForm(f => ({ ...f, defaultLanguage: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Salary Format Type</label>
                      <select
                        value={form.salaryFormat.type}
                        onChange={(e) => setForm(f => ({ ...f, salaryFormat: { ...f.salaryFormat, type: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categories (Comma separated)</label>
                      <input
                        value={categoriesText}
                        onChange={(e) => setCategoriesText(e.target.value)}
                        placeholder="IT & Software, Marketing, Sales"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Skills (Comma separated)</label>
                      <input
                        value={skillsText}
                        onChange={(e) => setSkillsText(e.target.value)}
                        placeholder="react, javascript, python"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="space-y-6">
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supported Job Aggregators</span>
                    <div className="grid grid-cols-2 gap-2">
                      {JOB_SOURCES_OPTIONS.map(src => (
                        <label key={src} className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold capitalize">
                          <input
                            type="checkbox"
                            checked={form.supportedJobSources.includes(src)}
                            onChange={() => toggleMultiSelect('supportedJobSources', src)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-200"
                          />
                          {src}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supported ATS Connectors</span>
                    <div className="grid grid-cols-2 gap-2">
                      {ATS_SOURCES_OPTIONS.map(src => (
                        <label key={src} className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold capitalize">
                          <input
                            type="checkbox"
                            checked={form.supportedAtsSources.includes(src)}
                            onChange={() => toggleMultiSelect('supportedAtsSources', src)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-200"
                          />
                          {src}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Job Schedule Filters</span>
                    <div className="grid grid-cols-2 gap-2">
                      {JOB_TYPES_OPTIONS.map(type => (
                        <label key={type} className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold capitalize">
                          <input
                            type="checkbox"
                            checked={form.jobTypes.includes(type)}
                            onChange={() => toggleMultiSelect('jobTypes', type)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-200"
                          />
                          {type.replace('_', ' ')}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={form.pricingRules.providerPlansEnabled}
                        onChange={(e) => setForm(f => ({ ...f, pricingRules: { ...f.pricingRules, providerPlansEnabled: e.target.checked } }))}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      Enable Provider Plans
                    </label>
                    <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={form.pricingRules.recruiterPlansEnabled}
                        onChange={(e) => setForm(f => ({ ...f, pricingRules: { ...f.pricingRules, recruiterPlansEnabled: e.target.checked } }))}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      Enable Recruiter Plans
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pricing Currency</label>
                      <input
                        value={form.pricingRules.defaultCurrency}
                        onChange={(e) => setForm(f => ({ ...f, pricingRules: { ...f.pricingRules, defaultCurrency: e.target.value.toUpperCase() } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tax Label</label>
                      <input
                        value={form.pricingRules.taxName}
                        onChange={(e) => setForm(f => ({ ...f, pricingRules: { ...f.pricingRules, taxName: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tax Percentage (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.pricingRules.taxPercentage}
                        onChange={(e) => setForm(f => ({ ...f, pricingRules: { ...f.pricingRules, taxPercentage: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-6">
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Automated Landing Pages</span>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={form.seoRules.generateCountryPages}
                          onChange={(e) => setForm(f => ({ ...f, seoRules: { ...f.seoRules, generateCountryPages: e.target.checked } }))}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Generate Country Pages
                      </label>
                      <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={form.seoRules.generateCityPages}
                          onChange={(e) => setForm(f => ({ ...f, seoRules: { ...f.seoRules, generateCityPages: e.target.checked } }))}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Generate City Pages
                      </label>
                      <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={form.seoRules.generateSkillPages}
                          onChange={(e) => setForm(f => ({ ...f, seoRules: { ...f.seoRules, generateSkillPages: e.target.checked } }))}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Generate Skill Pages
                      </label>
                      <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={form.seoRules.generateCategoryPages}
                          onChange={(e) => setForm(f => ({ ...f, seoRules: { ...f.seoRules, generateCategoryPages: e.target.checked } }))}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        Generate Category Pages
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Minimum Active Jobs for Generating City/Skill Landing Page</label>
                    <input
                      type="number"
                      min="1"
                      value={form.seoRules.minimumJobsForSeoPage}
                      onChange={(e) => setForm(f => ({ ...f, seoRules: { ...f.seoRules, minimumJobsForSeoPage: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notification Digests & Gating</span>
                    <div className="grid grid-cols-2 gap-3">
                      {['dailyDigestEnabled', 'jobAlertEnabled', 'whatsappEnabled', 'smsEnabled', 'emailEnabled'].map(notif => (
                        <label key={notif} className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold capitalize">
                          <input
                            type="checkbox"
                            checked={form.notificationRules[notif]}
                            onChange={(e) => setForm(f => ({ ...f, notificationRules: { ...f.notificationRules, [notif]: e.target.checked } }))}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          {notif.replace('Enabled', '').replace(/([A-Z])/g, ' $1')}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2.5 p-3 border border-purple-100 rounded-xl bg-purple-50/50 hover:bg-purple-50 cursor-pointer text-sm font-bold text-purple-900">
                    <input
                      type="checkbox"
                      checked={form.isJobSyncEnabled || false}
                      onChange={(e) => setForm(f => ({ ...f, isJobSyncEnabled: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    Enable Job Ingestion & Synchronization (isJobSyncEnabled)
                  </label>

                  <label className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.syncRules.dailySyncEnabled}
                      onChange={(e) => setForm(f => ({ ...f, syncRules: { ...f.syncRules, dailySyncEnabled: e.target.checked } }))}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    Enable Nightly Auto Job Sync
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sync Frequency (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.syncRules.syncFrequencyHours}
                        onChange={(e) => setForm(f => ({ ...f, syncRules: { ...f.syncRules, syncFrequencyHours: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Inactive Retention Days</label>
                      <input
                        type="number"
                        min="1"
                        value={form.syncRules.inactiveJobRetentionDays}
                        onChange={(e) => setForm(f => ({ ...f, syncRules: { ...f.syncRules, inactiveJobRetentionDays: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Max Jobs Per Source Run</label>
                      <input
                        type="number"
                        min="10"
                        value={form.syncRules.maxJobsPerSource}
                        onChange={(e) => setForm(f => ({ ...f, syncRules: { ...f.syncRules, maxJobsPerSource: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Max Pages to Crawl Per Run</label>
                      <input
                        type="number"
                        min="1"
                        value={form.syncRules.maxPagesPerSource}
                        onChange={(e) => setForm(f => ({ ...f, syncRules: { ...f.syncRules, maxPagesPerSource: e.target.value } }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-md"
                >
                  {editingCountry ? 'Save Parameters' : 'Create Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Country Config</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete the configuration for <strong className="text-gray-800">"{deleteModal.countryName}"</strong>? This will remove all sync settings, currency mapping, and landing rules for this country.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, countryId: null, countryName: '' })}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCountries;
