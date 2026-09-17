import React from 'react';
import useCascadingLocation from '../../hooks/useCascadingLocation';

/**
 * CascadeLocationSelect — Country → State → City dependent dropdowns.
 *
 * Props:
 *   - initialCountry {string}   - Pre-selected country (for edit mode)
 *   - initialState   {string}   - Pre-selected state   (for edit mode)
 *   - initialCity    {string}   - Pre-selected city    (for edit mode)
 *   - onCountryChange {Function(country)} - Called when country changes
 *   - onStateChange   {Function(state)}   - Called when state changes
 *   - onCityChange    {Function(city)}    - Called when city changes
 *   - required        {boolean}           - Marks fields as required
 *   - disabled        {boolean}           - Disables all selects
 *   - selectClassName {string}            - Extra classes for select elements
 *   - showLabels      {boolean}           - Whether to show label above each select (default: true)
 *
 * Backward compatibility:
 *   Old profiles with text-based location still display correctly because
 *   the parent can use LocationSearch for those forms. This component is only
 *   used in NEW forms (registration) where structured data is desired.
 *
 * Usage:
 *   <CascadeLocationSelect
 *     onCountryChange={(c) => setForm(f => ({ ...f, country: c }))}
 *     onStateChange={(s) => setForm(f => ({ ...f, state: s }))}
 *     onCityChange={(c) => setForm(f => ({ ...f, city: c }))}
 *   />
 */
const CascadeLocationSelect = ({
  initialCountry = '',
  initialState = '',
  initialCity = '',
  onCountryChange,
  onStateChange,
  onCityChange,
  required = false,
  disabled = false,
  selectClassName = '',
  showLabels = true,
}) => {
  const {
    countries,
    states,
    cities,
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    loadingCountries,
    loadingStates,
    loadingCities,
    errorCountries,
    errorStates,
    errorCities,
  } = useCascadingLocation({ initialCountry, initialState, initialCity });

  const baseCls = `w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white 
    focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition 
    disabled:bg-gray-50 disabled:cursor-not-allowed ${selectClassName}`;

  const handleCountry = (e) => {
    const val = e.target.value;
    setSelectedCountry(val);
    onCountryChange?.(val);
    onStateChange?.('');
    onCityChange?.('');
  };

  const handleState = (e) => {
    const val = e.target.value;
    setSelectedState(val);
    onStateChange?.(val);
    onCityChange?.('');
  };

  const handleCity = (e) => {
    const val = e.target.value;
    setSelectedCity(val);
    onCityChange?.(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* ── Country ── */}
      <div>
        {showLabels && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Country {required && <span className="text-red-700">*</span>}
          </label>
        )}
        <select
          value={selectedCountry}
          onChange={handleCountry}
          disabled={disabled || loadingCountries}
          required={required}
          className={baseCls}
          aria-label="Country"
        >
          <option value="">
            {loadingCountries ? 'Loading countries...' : 'Select Country'}
          </option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errorCountries && (
          <p className="text-xs text-amber-600 mt-1">{errorCountries}</p>
        )}
      </div>

      {/* ── State ── */}
      <div>
        {showLabels && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            State / Province
          </label>
        )}
        <select
          value={selectedState}
          onChange={handleState}
          disabled={disabled || !selectedCountry || loadingStates}
          className={baseCls}
          aria-label="State"
        >
          <option value="">
            {!selectedCountry
              ? 'Select country first'
              : loadingStates
              ? 'Loading states...'
              : states.length === 0
              ? 'No states found'
              : 'Select State'}
          </option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errorStates && (
          <p className="text-xs text-amber-600 mt-1">{errorStates}</p>
        )}
      </div>

      {/* ── City ── */}
      <div>
        {showLabels && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            City
          </label>
        )}
        <select
          value={selectedCity}
          onChange={handleCity}
          disabled={disabled || !selectedState || loadingCities}
          className={baseCls}
          aria-label="City"
        >
          <option value="">
            {!selectedState
              ? 'Select state first'
              : loadingCities
              ? 'Loading cities...'
              : cities.length === 0
              ? 'No cities found'
              : 'Select City'}
          </option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errorCities && (
          <p className="text-xs text-amber-600 mt-1">{errorCities}</p>
        )}
      </div>
    </div>
  );
};

export default CascadeLocationSelect;
