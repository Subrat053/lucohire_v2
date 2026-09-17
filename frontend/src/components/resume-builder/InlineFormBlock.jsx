import React, { useState } from 'react';
import { Pencil, Check, GripVertical, Trash2 } from 'lucide-react';

export default function InlineFormBlock({ 
  renderPreview, 
  renderForm, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  isDraggable = true 
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="relative border-2 border-emerald-400 bg-emerald-50/50 p-4 rounded-xl shadow-sm my-2 font-sans z-10 break-words" onClick={e => e.stopPropagation()}>
        {renderForm()}
        <div className="flex justify-end mt-4 pt-3 border-t border-emerald-200">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative border border-transparent hover:border-emerald-200 hover:bg-emerald-50/30 rounded-lg -mx-2 px-2 py-1 transition-all cursor-pointer break-words"
      onClick={() => setIsEditing(true)}
    >
      {/* Controls that appear on hover */}
      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1.5 bg-white text-emerald-600 hover:bg-emerald-100 rounded-md shadow-sm border border-emerald-100"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        
        {isDraggable && onMoveUp && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1.5 bg-white text-slate-500 hover:bg-slate-100 rounded-md shadow-sm border border-slate-100"
            title="Move Up"
          >
            ↑
          </button>
        )}
        
        {isDraggable && onMoveDown && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1.5 bg-white text-slate-500 hover:bg-slate-100 rounded-md shadow-sm border border-slate-100"
            title="Move Down"
          >
            ↓
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 bg-white text-red-700 hover:bg-red-50 rounded-md shadow-sm border border-red-100 ml-1"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="pointer-events-none">
        {renderPreview()}
      </div>
    </div>
  );
}

// Export some standard styled inputs for the forms so they don't inherit the resume's font
export const FormInput = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1 mb-3 font-sans">
    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
    />
  </div>
);

export const FormTextarea = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-1 mb-3 font-sans">
    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white resize-y"
    />
  </div>
);
