import React, { useRef, useEffect } from 'react';
import { useResume } from './ResumeContext';

export default function EditableField({ 
  value, 
  onChange, 
  placeholder = "Click to edit", 
  className = "",
  multiline = false,
  element = "span"
}) {
  const { activeElementId, setActiveElementId } = useResume();
  const id = useRef(Math.random().toString(36).substring(7)).current;
  const contentRef = useRef(null);

  // Safely update the DOM from props only if we aren't actively editing it
  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      const isEmpty = !value || value.trim() === '';
      if (isEmpty) {
        contentRef.current.innerHTML = `<span class="text-blue-500 font-medium bg-blue-50 px-1 py-0.5 rounded text-[0.9em] pointer-events-none select-none">[${placeholder}]</span>`;
      } else {
        contentRef.current.innerText = value;
      }
    }
  }, [value, placeholder]);

  const handleBlur = (e) => {
    if (setActiveElementId) setActiveElementId(null);
    
    // innerText preserves newlines better than textContent
    let newValue = e.currentTarget.innerText;
    
    // If the user typed nothing and the placeholder is still there (shouldn't happen because of focus, but just in case)
    if (newValue === `[${placeholder}]`) {
      newValue = '';
    }

    if (newValue !== value) {
      onChange(newValue);
    }
    
    // If they left it blank, restore placeholder immediately visually
    if (!newValue || newValue.trim() === '') {
       e.currentTarget.innerHTML = `<span class="text-blue-500 font-medium bg-blue-50 px-1 py-0.5 rounded text-[0.9em] pointer-events-none select-none">[${placeholder}]</span>`;
    }
  };

  const handleFocus = (e) => {
    if (setActiveElementId) setActiveElementId(id);
    
    // Clear placeholder visually when they start editing an empty field
    if (!value || value.trim() === '') {
      e.currentTarget.innerHTML = '';
    }
  };

  const handleKeyDown = (e) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const isActive = activeElementId === id;
  const Component = element;
  
  // We use inline-block when empty so it has physical width to click on
  const isEmpty = !value || value.trim() === '';

  return (
    <Component
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={`
        break-words outline-none transition-all cursor-text rounded-sm relative
        ${isActive ? 'ring-2 ring-blue-400 bg-blue-50/10' : 'hover:bg-slate-50 hover:ring-1 hover:ring-slate-200'}
        ${isEmpty ? 'min-w-[40px] inline-block' : ''}
        ${className}
      `}
      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
    />
  );
}
