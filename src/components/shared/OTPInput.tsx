import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 4, value, onChange }) => {
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    const nextIndex = Math.max(Math.min(length - 1, index), 0);
    inputRefs.current[nextIndex]?.focus();
    setActiveInput(nextIndex);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      if (newValue[index]) {
        newValue[index] = '';
        onChange(newValue.join(''));
      } else {
        // move to prev and delete
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^[0-9]*$/.test(val)) return; // Allow numbers only

    // Grab the last char if they pasted or typed multiple somehow
    const char = val.slice(-1);
    
    const newValue = value.split('');
    // Pad array if needed
    while (newValue.length < length) newValue.push('');
    
    newValue[index] = char;
    onChange(newValue.join(''));

    if (char !== '') {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length).replace(/[^0-9]/g, '');
    if (pastedData) {
      onChange(pastedData);
      focusInput(Math.min(pastedData.length, length - 1));
    }
  };

  return (
    <div className="flex justify-center gap-3 md:gap-4 w-full" dir="ltr">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setActiveInput(index)}
          onPaste={handlePaste}
          className="otp-input w-14 h-16 md:w-16 md:h-20 text-center text-3xl font-black rounded-2xl shadow-sm transition-all focus:scale-110"
          placeholder="-"
        />
      ))}
    </div>
  );
};
