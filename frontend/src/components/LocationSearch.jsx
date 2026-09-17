import LocationAutocomplete from './common/LocationAutocomplete';

const LocationSearch = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Type location...',
  className = 'mt-2',
  minChars = 3,
  iconClassName,
  inputClassName
}) => {
  return (
    <LocationAutocomplete
      iconClassName={iconClassName}
      inputClassName={inputClassName}
      value={value}
      onChange={(text) => {
        if (onChange) onChange(text);
      }}
      onSelect={(locationObj) => {
        if (!locationObj) {
          if (onChange) onChange('');
          if (onSelect) onSelect(null);
          return;
        }

        // Trigger the simple text onChange callback
        if (onChange) {
          onChange(locationObj.label || locationObj.value || '');
        }

        // Trigger the detailed place selection callback
        if (onSelect) {
          onSelect({
            placeId: locationObj.placeId,
            name: locationObj.city || locationObj.label || '',
            formattedAddress: locationObj.label || '',
            latitude: locationObj.latitude,
            longitude: locationObj.longitude,
            lat: locationObj.latitude,
            lon: locationObj.longitude,
            city: locationObj.city,
            state: locationObj.state,
            country: locationObj.country,
            raw: locationObj.raw,
            isFallbackSelection: locationObj.isFallbackSelection,
            isManualInput: locationObj.isManualInput
          });
        }
      }}
      placeholder={placeholder}
      className={className}
      mode="city"
    />
  );
};

export default LocationSearch;
