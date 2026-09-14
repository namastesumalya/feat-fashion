import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import { Bold, Italic, Heading, List, ListOrdered, Quote, Eye, Edit3, FileText } from 'lucide-react';

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  id = 'markdown-editor',
  value,
  onChange,
  placeholder = 'Write product craftsmanship story, fabric details, styling tips, or bullet points in Markdown...',
  rows = 5,
  label = 'Product Description & Craftsmanship Story (Markdown Supported)',
  required = false,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + prefix + defaultText + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const insertTemplate = () => {
    const template = `Exquisite handcrafted piece blending timeless Indian tradition with contemporary elegance.

### ✦ Highlights & Craftsmanship
- **Artisan Weave**: Handcrafted with rich weaving techniques and intricate detailing.
- **Silhouette & Fit**: Tailored for a graceful drape and all-day festive comfort.
- **Styling Advice**: Pair with statement jhumkas and embellished juttis for celebrations.

### ✦ Fabric & Authenticity
- 100% genuine certified premium textile.
- Color fastness and durable seam finishing.`;

    if (!value || value.trim() === '' || window.confirm('Replace existing description with structured craftsmanship template?')) {
      onChange(template);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-pink-700" />
          <span>{label}</span>
          {required && <span className="text-pink-600 font-black">*</span>}
        </label>

        {/* Tab switchers: Write vs Preview */}
        <div className="flex items-center gap-1 bg-pink-100/60 p-0.5 rounded-lg border border-pink-200/70 text-xs">
          <button
            type="button"
            id={`${id}-write-tab`}
            onClick={() => setActiveTab('write')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
              activeTab === 'write'
                ? 'bg-pink-900 text-amber-200 shadow-xs'
                : 'text-gray-600 hover:text-pink-950 hover:bg-white/60'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write (Markdown)</span>
          </button>
          <button
            type="button"
            id={`${id}-preview-tab`}
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
              activeTab === 'preview'
                ? 'bg-pink-900 text-amber-200 shadow-xs'
                : 'text-gray-600 hover:text-pink-950 hover:bg-white/60'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {activeTab === 'write' ? (
        <div className="border border-pink-200 rounded-2xl bg-white shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-pink-600 focus-within:border-pink-600 transition-all">
          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 bg-pink-50/70 border-b border-pink-100 text-xs">
            <button
              type="button"
              title="Bold (**text**)"
              onClick={() => insertFormatting('**', '**', 'Bold Text')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Italic (*text*)"
              onClick={() => insertFormatting('*', '*', 'Italic Text')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Heading (### Heading)"
              onClick={() => insertFormatting('### ', '\n', 'Section Heading')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-pink-200 mx-1" />
            <button
              type="button"
              title="Bullet List (- Item)"
              onClick={() => insertFormatting('- ', '\n', 'List item')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Numbered List (1. Item)"
              onClick={() => insertFormatting('1. ', '\n', 'Numbered item')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Quote / Highlight (> Note)"
              onClick={() => insertFormatting('> ', '\n', 'Special artisan note or feature highlight')}
              className="p-1.5 hover:bg-pink-200/80 rounded-lg text-gray-700 hover:text-pink-950 transition-colors"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <div className="ml-auto">
              <button
                type="button"
                onClick={insertTemplate}
                className="flex items-center gap-1 text-[10px] font-bold text-pink-900 bg-pink-100 hover:bg-pink-200 px-2 py-1 rounded-md transition-colors"
              >
                <FileText className="w-3 h-3 text-pink-700" />
                <span>Insert Story Template</span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id={id}
            rows={rows}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 font-mono text-xs sm:text-sm text-gray-800 focus:outline-none bg-white resize-y"
          />

          <div className="px-3 py-1.5 bg-stone-50 border-t border-pink-50 flex items-center justify-between text-[11px] text-gray-500">
            <span>Supports standard Markdown: <strong>**bold**</strong>, <em>*italic*</em>, <code>### Headings</code>, <code>- Bullets</code></span>
            <span>{value ? `${value.length} characters` : 'Empty'}</span>
          </div>
        </div>
      ) : (
        <div className="border border-pink-200 rounded-2xl p-4 bg-pink-50/30 min-h-[140px] max-h-[300px] overflow-y-auto">
          {value && value.trim() !== '' ? (
            <div className="markdown-body text-xs sm:text-sm text-gray-800 leading-relaxed space-y-2">
              <Markdown>{value}</Markdown>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No description written yet. Switch to "Write" tab to enter product details in markdown.</p>
          )}
        </div>
      )}
    </div>
  );
};
