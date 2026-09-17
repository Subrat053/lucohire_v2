import { useState } from 'react';
import { HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const PasswordInput = ({ value, onChange, name, placeholder, error, autoComplete = 'current-password', required = true }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1">
      <div className="relative">
        <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          name={name}
          aria-label={placeholder}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`w-full pl-10 pr-11 py-3 border-2 ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-400'} rounded-xl outline-none transition text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:border-transparent`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none flex items-center justify-center"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <HiEyeOff className="w-5 h-5" aria-hidden="true" />
          ) : (
            <HiEye className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && <p className="text-red-700 text-xs mt-1 pl-1 font-medium">{error}</p>}
    </div>
  );
};

export default PasswordInput;
