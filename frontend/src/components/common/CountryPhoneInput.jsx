import { useState, useEffect, useRef } from "react";
import { HiSearch, HiChevronDown, HiExclamationCircle } from "react-icons/hi";

// ─── Hardcoded seed list (used immediately & as fallback) ────────────────────
export const SEED_COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { code: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "LY", name: "Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "SD", name: "Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "🇨🇲" },
  { code: "CI", name: "Ivory Coast", dialCode: "+225", flag: "🇨🇮" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "🇲🇺" },
  { code: "MV", name: "Maldives", dialCode: "+960", flag: "🇲🇻" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
];

// ─── Module-level cache so the API is fetched only once per app session ──────
let _allCountriesCache = null;
let _fetchPromise = null;

async function fetchAllCountries() {
  if (_allCountriesCache) return _allCountriesCache;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const res = await fetch(
        "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://restcountries.com/v3.1/all?fields=name,idd,cca2,flag"),
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const seen = new Set();
      const list = data
        .filter(
          (c) =>
            c.idd?.root &&
            c.cca2 &&
            c.name?.common
        )
        .map((c) => {
          const root = c.idd.root || "";
          const suffix =
            Array.isArray(c.idd.suffixes) && c.idd.suffixes.length === 1
              ? c.idd.suffixes[0]
              : "";
          const dialCode = root + suffix;
          if (!dialCode || !dialCode.startsWith("+")) return null;

          // Convert cca2 → flag emoji (each letter maps to a regional indicator)
          const flag = c.flag || cca2ToFlag(c.cca2);

          return {
            code: c.cca2,
            name: c.name.common,
            dialCode,
            flag,
          };
        })
        .filter(Boolean)
        .filter((c) => {
          // Deduplicate by code+dialCode
          const key = `${c.code}|${c.dialCode}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      _allCountriesCache = list.length > 20 ? list : SEED_COUNTRIES;
      return _allCountriesCache;
    } catch {
      _allCountriesCache = SEED_COUNTRIES;
      return _allCountriesCache;
    }
  })();

  return _fetchPromise;
}

function cca2ToFlag(cca2) {
  if (!cca2 || cca2.length !== 2) return "🏳";
  return [...cca2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

// ─── Known validation rules (extend as needed) ───────────────────────────────
const COUNTRY_VALIDATION = {
  "+91": { regex: /^[6-9]\d{9}$/, placeholder: "98765 43210", error: "Enter a valid 10-digit Indian mobile number." },
  "+1":  { regex: /^[2-9]\d{9}$/, placeholder: "201 555 0123", error: "Enter a valid 10-digit number." },
  "+44": { regex: /^[1-9]\d{8,9}$/, placeholder: "7123 456789", error: "Enter a valid UK phone number." },
  "+61": { regex: /^4\d{8}$/, placeholder: "412 345 678", error: "Enter a valid 9-digit mobile number." },
  "+49": { regex: /^1[5-7]\d{8,9}$/, placeholder: "170 1234567", error: "Enter a valid German phone number." },
  "+33": { regex: /^[67]\d{8}$/, placeholder: "6 12 34 56 78", error: "Enter a valid French phone number." },
  "+971": { regex: /^5[024568]\d{7}$/, placeholder: "50 123 4567", error: "Enter a valid UAE mobile number." },
  "+966": { regex: /^5\d{8}$/, placeholder: "50 123 4567", error: "Enter a valid Saudi mobile number." },
  "+65": { regex: /^[89]\d{7}$/, placeholder: "8123 4567", error: "Enter a valid 8-digit Singapore number." },
  "+60": { regex: /^1\d{8,9}$/, placeholder: "12 345 6789", error: "Enter a valid Malaysian number." },
  "+880": { regex: /^1[3-9]\d{8}$/, placeholder: "1712 345678", error: "Enter a valid 10-digit Bangladesh number." },
  "+92": { regex: /^3\d{9}$/, placeholder: "300 1234567", error: "Enter a valid 10-digit Pakistan number." },
  "+977": { regex: /^9[78]\d{8}$/, placeholder: "9841 234567", error: "Enter a valid 10-digit Nepal number." },
  "+94": { regex: /^7[0-9]\d{7}$/, placeholder: "71 234 5678", error: "Enter a valid 9-digit Sri Lanka number." },
};

// ─── Exported for backwards-compat: sync view of loaded countries ─────────────
// Initially = SEED_COUNTRIES; updates after async fetch completes.
export let countries = [...SEED_COUNTRIES];

// ─── Main Component ───────────────────────────────────────────────────────────
const CountryPhoneInput = ({
  countryCode = "+91",
  nationalNumber = "",
  onChange,
  disabled = false,
  required = false,
  error = "",
  variant = "default", // "default", "profile", "partner-recruiter", "partner-provider", "admin-partner", "admin-manager"
  inputClassName = "",
  buttonClassName = "",
  accent = "indigo",
}) => {
  const [allCountries, setAllCountries] = useState(SEED_COUNTRIES);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Fetch all countries once
  useEffect(() => {
    fetchAllCountries().then((list) => {
      setAllCountries(list);
      countries = list; // update module-level export
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCountry =
    allCountries.find((c) => c.dialCode === countryCode) ||
    SEED_COUNTRIES.find((c) => c.dialCode === countryCode) ||
    allCountries[0];

  const validationRule = COUNTRY_VALIDATION[selectedCountry?.dialCode];

  const filteredCountries = allCountries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const emitChange = (dialCode, national) => {
    if (!onChange) return;
    const cleanNum = national.replace(/\D/g, "");
    const fullPhone = dialCode + cleanNum;
    let validationError = "";
    const rule = COUNTRY_VALIDATION[dialCode];
    if (cleanNum && rule && !rule.regex.test(cleanNum)) {
      validationError = rule.error;
    } else if (cleanNum && !rule && (cleanNum.length < 7 || cleanNum.length > 15)) {
      validationError = "Enter a valid phone number (7–15 digits).";
    }
    onChange({ countryCode: dialCode, nationalNumber: cleanNum, fullPhone, isValid: !validationError, validationError });
  };

  const handleCountrySelect = (country) => {
    setIsOpen(false);
    setSearch("");
    emitChange(country.dialCode, nationalNumber);
  };

  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, "");
    emitChange(selectedCountry.dialCode, cleaned);
  };

  // Map variant to theme colors
  const getTheme = () => {
    let ringColor = "focus:ring-indigo-400";
    let focusBorder = "focus:border-transparent";
    let bgHighlight = "bg-indigo-50";
    let textHighlight = "text-indigo-700";
    let hoverHighlight = "hover:bg-indigo-50";
    let searchRing = "focus:ring-indigo-400";

    const effectiveAccent = variant === "default" ? accent : null;
    const theme = effectiveAccent || {
      profile: "violet",
      "partner-recruiter": "violet",
      "partner-provider": "purple",
      "admin-partner": "indigo",
      "admin-manager": "indigo",
    }[variant] || "indigo";

    if (theme === "violet") {
      ringColor = "focus:ring-violet-100";
      focusBorder = "focus:border-violet-500";
      bgHighlight = "bg-violet-50";
      textHighlight = "text-violet-700";
      hoverHighlight = "hover:bg-violet-50";
      searchRing = "focus:ring-violet-400";
    } else if (theme === "purple") {
      ringColor = "focus:ring-purple-100";
      focusBorder = "focus:border-purple-200";
      bgHighlight = "bg-purple-50";
      textHighlight = "text-purple-700";
      hoverHighlight = "hover:bg-purple-50";
      searchRing = "focus:ring-purple-400";
    } else if (theme === "blue") {
      ringColor = "focus:ring-blue-400/50";
      focusBorder = "focus:border-blue-400";
      bgHighlight = "bg-blue-50";
      textHighlight = "text-blue-700";
      hoverHighlight = "hover:bg-blue-50";
      searchRing = "focus:ring-blue-400";
    } else if (theme === "indigo") {
      ringColor = "focus:ring-indigo-400/50";
      focusBorder = "focus:border-indigo-400";
      bgHighlight = "bg-indigo-50";
      textHighlight = "text-indigo-700";
      hoverHighlight = "hover:bg-indigo-50";
      searchRing = "focus:ring-indigo-400";
    }

    return { ringColor, focusBorder, bgHighlight, textHighlight, hoverHighlight, searchRing };
  };

  const themeColors = getTheme();

  let buttonClasses = "";
  let inputClasses = "";

  if (variant === "profile") {
    buttonClasses = `flex items-center gap-1.5 px-3.5 h-[38px] text-xs rounded-xl border border-slate-200 outline-none ${themeColors.focusBorder} focus:ring-4 ${themeColors.ringColor} bg-slate-50/50 text-slate-700 font-semibold transition-all disabled:opacity-50 min-w-[90px]`;
    inputClasses = `w-full px-4 h-[38px] text-xs rounded-xl border border-slate-200 ${themeColors.focusBorder} outline-none focus:ring-4 ${themeColors.ringColor} bg-slate-50/50 shadow-inner transition text-slate-900 font-semibold`;
  } else if (variant === "partner-recruiter") {
    buttonClasses = `flex items-center gap-1.5 h-16 px-5 border border-slate-200 rounded-2xl bg-slate-50/80 text-slate-900 font-semibold focus:bg-white ${themeColors.focusBorder} focus:ring-4 ${themeColors.ringColor} outline-none transition-all disabled:opacity-50 min-w-[100px]`;
    inputClasses = `w-full h-16 px-5 rounded-2xl border border-slate-200 bg-slate-50/80 focus:bg-white ${themeColors.focusBorder} focus:ring-4 ${themeColors.ringColor} outline-none transition-all text-slate-900 font-semibold`;
  } else if (variant === "partner-provider") {
    buttonClasses = `flex items-center gap-1.5 h-[62px] px-5 rounded-3xl border border-white bg-white/80 font-semibold text-slate-900 outline-none shadow-sm transition ${themeColors.focusBorder} focus:bg-white focus:ring-4 ${themeColors.ringColor} disabled:opacity-50 min-w-[100px]`;
    inputClasses = `w-full rounded-3xl border border-white bg-white/80 h-[62px] px-5 font-semibold text-slate-900 outline-none shadow-sm transition placeholder:text-slate-400 ${themeColors.focusBorder} focus:bg-white focus:ring-4 ${themeColors.ringColor}`;
  } else if (variant === "admin-partner") {
    buttonClasses = `flex items-center gap-1.5 h-[38px] px-3 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 font-medium focus:ring-2 ${themeColors.ringColor} outline-none transition-all disabled:opacity-50 min-w-[90px]`;
    inputClasses = `w-full border border-gray-300 rounded-xl px-4 h-[38px] text-sm focus:ring-2 ${themeColors.ringColor} outline-none transition-all text-gray-900`;
  } else if (variant === "admin-manager") {
    buttonClasses = `flex items-center gap-1.5 h-[42px] px-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 outline-none transition-all disabled:opacity-50 min-w-[90px] focus:ring-2 ${themeColors.ringColor}`;
    inputClasses = `w-full px-3 h-[42px] border border-gray-200 rounded-xl outline-none transition-all text-gray-900 focus:ring-2 ${themeColors.ringColor}`;
  } else {
    // "default" variant (matches current authPage)
    buttonClasses = `flex items-center justify-center gap-1 h-[52px] px-2 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 font-semibold ${themeColors.focusBorder} focus:bg-white focus:ring-2 ${themeColors.ringColor} transition-all disabled:opacity-50 min-w-[76px] outline-none`;
    inputClasses = `w-full h-[52px] px-4 border-2 border-gray-200 rounded-xl outline-none transition text-sm font-semibold bg-gray-50 focus:bg-white focus:ring-2 ${themeColors.ringColor} focus:border-transparent`;
  }

  const errorClasses = error ? "border-red-400 focus:ring-red-400 focus:border-red-400" : "";
  const finalInputClasses = `${inputClasses} ${errorClasses} ${inputClassName}`.trim();
  const finalButtonClasses = `${buttonClasses} ${buttonClassName}`.trim();

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="flex gap-2">
        {/* Country dropdown toggle */}
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((o) => !o)}
            className={finalButtonClasses}
          >
            {selectedCountry?.code && (
              <img
                src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                alt={selectedCountry.code}
                className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <span className="font-mono text-xs">{selectedCountry?.dialCode}</span>
            <HiChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-50 sticky top-0 bg-white">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search country or dial code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 ${themeColors.searchRing}`}
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={`${country.code}-${country.dialCode}`}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-left text-xs font-semibold ${themeColors.hoverHighlight} transition-colors ${
                        country.dialCode === countryCode
                          ? `${themeColors.bgHighlight} ${themeColors.textHighlight}`
                          : "text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {country?.code && (
                          <img
                            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                            alt={country.code}
                            className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <span className="truncate max-w-[160px]">{country.name}</span>
                      </div>
                      <span className="text-gray-400 font-mono text-[11px] shrink-0 ml-2">
                        {country.dialCode}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-xs text-gray-400">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Number input */}
        <div className="relative flex-1">
          <input
            type="tel"
            disabled={disabled}
            required={required}
            value={nationalNumber}
            onChange={handlePhoneChange}
            placeholder={
              validationRule
                ? `e.g. ${validationRule.placeholder}`
                : "Phone number"
            }
            className={finalInputClasses}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-700">
          <HiExclamationCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

// ─── parsePhoneString helper (used across auth & profile) ────────────────────
export const parsePhoneString = (fullPhoneStr) => {
  if (!fullPhoneStr) {
    return { countryCode: "+91", nationalNumber: "", fullPhone: "" };
  }

  const clean = fullPhoneStr.trim();
  const digits = clean.replace(/\D/g, "");

  // Use loaded countries (may be extended by async fetch)
  const list = _allCountriesCache || SEED_COUNTRIES;

  if (clean.startsWith("+")) {
    // Sort by dialCode length descending to match longest prefix first
    const sorted = [...list].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
      if (clean.startsWith(c.dialCode)) {
        const national = clean.slice(c.dialCode.length).replace(/\D/g, "");
        return { countryCode: c.dialCode, nationalNumber: national, fullPhone: c.dialCode + national };
      }
    }
    // Generic fallback
    const match = clean.match(/^\+(\d{1,4})/);
    if (match) {
      const dial = "+" + match[1];
      const national = clean.slice(dial.length).replace(/\D/g, "");
      return { countryCode: dial, nationalNumber: national, fullPhone: dial + national };
    }
  }

  // No leading plus
  if (digits.length === 10) {
    return { countryCode: "+91", nationalNumber: digits, fullPhone: "+91" + digits };
  }

  // Try to detect country from prefix
  const sorted = [...list].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    const dialDigits = c.dialCode.replace("+", "");
    if (digits.startsWith(dialDigits)) {
      const national = digits.slice(dialDigits.length);
      return { countryCode: c.dialCode, nationalNumber: national, fullPhone: c.dialCode + national };
    }
  }

  return { countryCode: "+91", nationalNumber: digits, fullPhone: "+91" + digits };
};

export default CountryPhoneInput;
