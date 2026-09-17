import { useState, useEffect, useRef } from 'react';
import { HiSave, HiCurrencyDollar, HiChevronDown } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FilterDropdown = ({ label, icon: Icon, value, setValue, options, placeholder, fullWidth = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (searchTerm && !options.some(opt => opt.label.toLowerCase() === searchTerm.toLowerCase())) {
          setValue(searchTerm);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm, options, setValue]);

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayValue = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-full sm:w-auto min-w-[150px]'}`} ref={wrapperRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center text-sm bg-white border rounded-xl px-4 py-2.5 transition whitespace-nowrap ${fullWidth ? 'w-full justify-between' : 'justify-between'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${isOpen && !disabled ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-sm' : 'border-gray-200 text-gray-700'}`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-gray-400" />}
          <span className={`truncate ${value ? "text-gray-900 font-medium" : "text-gray-700"}`}>
            {displayValue || label}
          </span>
        </div>
        <HiChevronDown className={`w-4 h-4 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180 text-amber-500' : 'text-gray-400'}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 top-full mt-1 left-0 w-full min-w-[160px] bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden flex flex-col`}>
          <div className="p-2 border-b border-gray-50">
            <input
              type="text"
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              placeholder={placeholder || `Search...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const matched = filteredOptions.find(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());
                  setValue(matched ? matched.value : searchTerm);
                  setIsOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <li 
                  key={i}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 cursor-pointer"
                  onClick={() => {
                    setValue(opt.value);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-400 text-center font-medium">No match found</li>
            )}
            {value && (
              <li 
                className="px-3 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer border-t border-gray-50 mt-1 font-medium"
                onClick={() => {
                  setValue('');
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                Clear selection
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const AdminCurrency = () => {
  const [settings, setSettings] = useState({ defaultCurrency: 'INR', enableAED: true, enableUSD: true, exchangeRateINRtoAED: 0.044, exchangeRateINRtoUSD: 0.012 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getCurrencySettings();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch {
      // settings may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateCurrencySettings(settings);
      toast.success('Currency settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <HiCurrencyDollar className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">Currency & Localization</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Currency Settings</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
            <FilterDropdown
              label="Select Default Currency"
              fullWidth
              value={settings.defaultCurrency}
              setValue={val => setSettings(s => ({ ...s, defaultCurrency: val }))}
              options={[
                { value: 'INR', label: 'INR (₹) - Indian Rupee' },
                { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
                { value: 'USD', label: 'USD ($) - US Dollar' }
              ]}
            />
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 mb-3">Enabled Currencies</h3>
        <div className="flex gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked disabled className="w-4 h-4 rounded border-gray-300 text-amber-500" />
            <span className="text-sm text-gray-700">INR (₹) — Always enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.enableAED} onChange={(e) => setSettings(s => ({ ...s, enableAED: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
            <span className="text-sm text-gray-700">AED (د.إ)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.enableUSD} onChange={(e) => setSettings(s => ({ ...s, enableUSD: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
            <span className="text-sm text-gray-700">USD ($)</span>
          </label>
        </div>

        <h3 className="font-semibold text-gray-800 mb-3">Exchange Rates (from INR)</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1 INR = ? AED</label>
            <input type="number" step="0.0001" value={settings.exchangeRateINRtoAED}
              onChange={(e) => setSettings(s => ({ ...s, exchangeRateINRtoAED: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1 INR = ? USD</label>
            <input type="number" step="0.0001" value={settings.exchangeRateINRtoUSD}
              onChange={(e) => setSettings(s => ({ ...s, exchangeRateINRtoUSD: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Plan prices in AED and USD are set individually on the Plans page.
            These exchange rates are used for reference display and auto-calculation fallbacks.
          </p>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition text-sm font-medium disabled:opacity-50">
          <HiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Currency Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminCurrency;
