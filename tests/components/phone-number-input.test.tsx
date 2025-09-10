/**
 * @fileoverview Tests for PhoneNumberInput component
 * 
 * @description React Testing Library tests for the international phone number
 * input component. Tests country detection, validation, formatting, and user
 * interactions with the phone input interface.
 * 
 * @coverage
 * - Component rendering with different props
 * - Country auto-detection from browser locale
 * - Phone number formatting and validation
 * - Error state handling and display
 * - User interactions and callbacks
 * - Accessibility features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';

// Mock navigator.language for country detection tests
const mockNavigator = {
  language: 'en-US'
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
});

describe('PhoneNumberInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.language to default
    mockNavigator.language = 'en-US';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render phone input component', () => {
      // CONTEXT: Test basic component rendering
      render(<PhoneNumberInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'tel');
      expect(input).toHaveAttribute('autocomplete', 'tel');
    });

    it('should apply custom className', () => {
      // CONTEXT: Test custom styling
      const customClass = 'custom-phone-input';
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          className={customClass} 
        />
      );
      
      const container = screen.getByRole('textbox').closest('.custom-phone-input');
      expect(container).toBeInTheDocument();
    });

    it('should show custom placeholder', () => {
      // CONTEXT: Test custom placeholder
      const placeholder = 'Enter your mobile number';
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          placeholder={placeholder} 
        />
      );
      
      const input = screen.getByPlaceholderText(placeholder);
      expect(input).toBeInTheDocument();
    });

    it('should display provided value', () => {
      // CONTEXT: Test value display
      const phoneNumber = '+15551234567';
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          value={phoneNumber} 
        />
      );
      
      const input = screen.getByDisplayValue('+1 555 123 4567');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Country Detection', () => {
    it('should detect US country from en-US locale', async () => {
      // CONTEXT: Test automatic country detection
      mockNavigator.language = 'en-US';
      
      render(<PhoneNumberInput {...defaultProps} />);
      
      await waitFor(() => {
        const countrySelect = screen.getByRole('combobox');
        expect(countrySelect).toHaveValue('US');
      });
    });

    it('should detect GB country from en-GB locale', async () => {
      // CONTEXT: Test GB country detection
      mockNavigator.language = 'en-GB';
      
      render(<PhoneNumberInput {...defaultProps} />);
      
      await waitFor(() => {
        const countrySelect = screen.getByRole('combobox');
        expect(countrySelect).toHaveValue('GB');
      });
    });

    it('should default to US for unknown locales', async () => {
      // CONTEXT: Test fallback to US for unknown locales
      mockNavigator.language = 'unknown-LOCALE';
      
      render(<PhoneNumberInput {...defaultProps} />);
      
      await waitFor(() => {
        const countrySelect = screen.getByRole('combobox');
        expect(countrySelect).toHaveValue('US');
      });
    });

    it('should use provided defaultCountry over detected country', async () => {
      // CONTEXT: Test explicit default country override
      mockNavigator.language = 'en-US';
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          defaultCountry="FR" 
        />
      );
      
      await waitFor(() => {
        const countrySelect = screen.getByRole('combobox');
        expect(countrySelect).toHaveValue('FR');
      });
    });

    it('should handle navigation language detection errors gracefully', async () => {
      // CONTEXT: Test error handling for locale detection
      Object.defineProperty(window, 'navigator', {
        value: { 
          get language() { 
            throw new Error('Locale error'); 
          } 
        },
        writable: true
      });
      
      render(<PhoneNumberInput {...defaultProps} />);
      
      await waitFor(() => {
        const countrySelect = screen.getByRole('combobox');
        expect(countrySelect).toHaveValue('US'); // Should fallback to US
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when phone number is entered', async () => {
      // CONTEXT: Test onChange callback
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          onChange={onChange} 
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, '5551234567');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('+15551234567');
      });
    });

    it('should call onBlur when input loses focus', async () => {
      // CONTEXT: Test onBlur callback
      const onBlur = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          onBlur={onBlur} 
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab(); // Move focus away
      
      expect(onBlur).toHaveBeenCalled();
    });

    it('should format numbers as user types', async () => {
      // CONTEXT: Test real-time formatting
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          onChange={onChange} 
        />
      );
      
      const input = screen.getByRole('textbox');
      
      // Type a US number
      await user.type(input, '5551234567');
      
      // Should be formatted in the display
      await waitFor(() => {
        expect(input).toHaveDisplayValue('555 123 4567');
      });
      
      // Should call onChange with E.164 format
      expect(onChange).toHaveBeenCalledWith('+15551234567');
    });

    it('should handle country change', async () => {
      // CONTEXT: Test country selector interaction
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          onChange={onChange}
          value="+15551234567"
        />
      );
      
      const countrySelect = screen.getByRole('combobox');
      await user.selectOptions(countrySelect, 'GB');
      
      await waitFor(() => {
        expect(countrySelect).toHaveValue('GB');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state styling when error prop is true', () => {
      // CONTEXT: Test error state styling
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          error={true} 
        />
      );
      
      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveClass('border-destructive');
    });

    it('should display error message when provided', () => {
      // CONTEXT: Test error message display
      const errorMessage = 'Please enter a valid phone number';
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          error={true}
          errorMessage={errorMessage}
        />
      );
      
      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveClass('text-destructive');
    });

    it('should not display error message when error is false', () => {
      // CONTEXT: Test no error message when not in error state
      const errorMessage = 'Please enter a valid phone number';
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          error={false}
          errorMessage={errorMessage}
        />
      );
      
      const errorElement = screen.queryByText(errorMessage);
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      // CONTEXT: Test disabled state
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          disabled={true} 
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      // CONTEXT: Test disabled styling
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          disabled={true} 
        />
      );
      
      const container = screen.getByRole('textbox').closest('div');
      expect(container).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // CONTEXT: Test accessibility attributes
      const id = 'phone-input';
      const name = 'phoneNumber';
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          id={id}
          name={name}
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', id);
      expect(input).toHaveAttribute('name', name);
      expect(input).toHaveAttribute('type', 'tel');
      expect(input).toHaveAttribute('autocomplete', 'tel');
    });

    it('should be keyboard navigable', async () => {
      // CONTEXT: Test keyboard navigation
      const user = userEvent.setup();
      
      render(<PhoneNumberInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      const countrySelect = screen.getByRole('combobox');
      
      // Should be able to tab to input
      await user.tab();
      expect(input).toHaveFocus();
      
      // Should be able to tab to country selector
      await user.tab();
      expect(countrySelect).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work with form submission', () => {
      // CONTEXT: Test form integration
      const onSubmit = vi.fn();
      
      render(
        <form onSubmit={onSubmit}>
          <PhoneNumberInput 
            {...defaultProps} 
            name="phone"
            value="+15551234567"
          />
          <button type="submit">Submit</button>
        </form>
      );
      
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      fireEvent.click(submitButton);
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should preserve name attribute for form data', () => {
      // CONTEXT: Test form field naming
      const name = 'contactPhone';
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          name={name}
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', name);
    });
  });

  describe('International Numbers', () => {
    it('should handle international number input', async () => {
      // CONTEXT: Test international number handling
      const onChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          onChange={onChange}
          defaultCountry="GB"
        />
      );
      
      const input = screen.getByRole('textbox');
      await user.type(input, '2079460958');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('+442079460958');
      });
    });

    it('should display correct placeholder for different countries', async () => {
      // CONTEXT: Test country-specific placeholders
      render(
        <PhoneNumberInput 
          {...defaultProps} 
          defaultCountry="FR"
        />
      );
      
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        // French phone numbers have different formatting
        expect(input).toHaveAttribute('placeholder');
      });
    });
  });
});
