/**
 * @fileoverview International phone number input component
 * 
 * @description Reusable phone number input with country selector, formatting,
 * and validation. Built on top of react-phone-number-input for consistent
 * international phone number handling across the application.
 * 
 * @access Employee portal (agents/admins)
 * @security Client-side validation only - server validates E.164 format
 * @business_rule Phone numbers stored as E.164 format in database
 * @business_rule Smart country detection from browser locale
 */

'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import { CountryCode } from 'libphonenumber-js';
import { cn } from '@/lib/utils';
import 'react-phone-number-input/style.css';

interface PhoneNumberInputProps {
  /** Current phone number value (E.164 format) */
  value?: string;
  /** Callback when phone number changes */
  onChange?: (value: string | undefined) => void;
  /** Callback when input loses focus */
  onBlur?: () => void;
  /** Placeholder text (will be country-specific if not provided) */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** CSS class name for styling */
  className?: string;
  /** Default country code (auto-detected if not provided) */
  defaultCountry?: CountryCode;
  /** Whether to show error state styling */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Name attribute for form submission */
  name?: string;
  /** ID attribute for accessibility */
  id?: string;
}

/**
 * International Phone Number Input Component
 * 
 * @description Provides a phone number input with country selector, automatic
 * formatting, validation, and smart country detection. Outputs E.164 format.
 * 
 * @param value - Current phone number in E.164 format
 * @param onChange - Callback fired when phone number changes
 * @param onBlur - Callback fired when input loses focus
 * @param placeholder - Custom placeholder text
 * @param disabled - Whether input is disabled
 * @param className - Additional CSS classes
 * @param defaultCountry - Country to default to (auto-detected if not set)
 * @param error - Whether to show error styling
 * @param errorMessage - Error text to display
 * @param name - Form field name
 * @param id - HTML id attribute
 * @returns JSX.Element - Styled phone input with country selector
 * 
 * @business_rule Uses browser locale for smart country detection
 * @business_rule Validates numbers in real-time during typing
 * @business_rule Outputs E.164 format for database storage
 * 
 * @example
 * ```tsx
 * <PhoneNumberInput
 *   value={phoneNumber}
 *   onChange={setPhoneNumber}
 *   placeholder="Enter phone number"
 *   error={hasError}
 *   errorMessage="Please enter a valid phone number"
 * />
 * ```
 */
export const PhoneNumberInput = forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  ({
    value,
    onChange,
    onBlur,
    placeholder,
    disabled = false,
    className,
    defaultCountry,
    error = false,
    errorMessage,
    name,
    id,
  }, ref) => {
    const [detectedCountry, setDetectedCountry] = useState<CountryCode | undefined>(defaultCountry);

    // CONTEXT: Auto-detect country from browser locale on mount
    // BUSINESS_RULE: Provide smart defaults based on user's location
    useEffect(() => {
      if (!defaultCountry) {
        // Try to detect country from browser locale
        try {
          const locale = navigator.language || 'en-US';
          const countryFromLocale = locale.split('-')[1]?.toUpperCase();
          
          // Common country codes - expand as needed
          const validCountries: CountryCode[] = [
            'US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE',
            'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'JP', 'KR', 'CN', 'IN',
            'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'ZA', 'NG', 'EG'
          ];
          
          if (countryFromLocale && validCountries.includes(countryFromLocale as CountryCode)) {
            setDetectedCountry(countryFromLocale as CountryCode);
          } else {
            setDetectedCountry('US'); // Default fallback
          }
        } catch (error) {
          console.warn('Could not detect country from locale:', error);
          setDetectedCountry('US'); // Safe fallback
        }
      }
    }, [defaultCountry]);

    return (
      <div className="space-y-1">
        <PhoneInput
          ref={ref}
          international
          countryCallingCodeEditable={false}
          defaultCountry={detectedCountry}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          id={id}
          className={cn(
            // Base styling to match our design system
            'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error state styling
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          // Custom input component styling
          inputComponent={({ className: inputClassName, ...inputProps }) => (
            <input
              {...inputProps}
              type="tel"
              autoComplete="tel"
              className={cn(
                'flex-1 px-3 py-2 bg-transparent outline-none',
                'placeholder:text-muted-foreground',
                inputClassName
              )}
            />
          )}
          // Custom country select styling  
          countrySelectComponent={({ className: selectClassName, ...selectProps }) => (
            <select
              {...selectProps}
              className={cn(
                'px-2 py-2 bg-transparent border-r border-input outline-none text-sm',
                'focus:ring-0 focus:border-input',
                selectClassName
              )}
            />
          )}
        />
        
        {/* Error message display */}
        {error && errorMessage && (
          <p className="text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

PhoneNumberInput.displayName = 'PhoneNumberInput';
