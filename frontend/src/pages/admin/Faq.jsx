import { useState, useEffect } from 'react';
import { 
  HiSave, HiQuestionMarkCircle, HiPlus, HiTrash, 
  HiChevronDown, HiChevronUp 
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';



const AdminFaq = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data } = await adminAPI.getContent('faq');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setFaqs(parsed);
          } else if (parsed && Array.isArray(parsed.sections)) {
            setFaqs(parsed.sections.map((s, i) => ({
              id: String(i),
              question: s.title || s.question,
              answer: s.body || s.answer
            })));
          } else {
            setFaqs([]);
          }
        } catch {
          setFaqs([]);
        }
      } else {
        setFaqs([]);
      }
    } catch {
      toast.error('Failed to load FAQ items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaq = () => {
    const newItem = {
      id: Date.now().toString(),
      question: '',
      answer: ''
    };
    setFaqs(prev => [...prev, newItem]);
  };

  const handleUpdateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const handleDeleteFaq = (index) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= faqs.length) return;
    const updated = [...faqs];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFaqs(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save it in the object format so it remains compatible with the FAQ Page (FaqLayout)
      const payloadObj = {
        badge: 'TRUSTED BY',
        title: 'Frequently Asked Questions',
        sections: faqs.map(f => ({ title: f.question, body: f.answer }))
      };
      const payload = JSON.stringify(payloadObj);
      await adminAPI.updateContent('faq', payload);
      toast.success('FAQ items saved successfully!');
    } catch {
      toast.error('Failed to update FAQ content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <HiQuestionMarkCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Dynamic FAQ Builder</h1>
            <p className="text-xs text-gray-500 font-medium">Create, edit, and reorder questions & answers for the public FAQ page.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-sm text-sm disabled:opacity-50"
        >
          <HiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All FAQs'}
        </button>
      </div>

      <div className="space-y-6">
        {/* FAQ Items List */}
        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div key={item.id || index} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 relative group">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 font-black text-xs flex items-center justify-center border border-teal-100">
                    {index + 1}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">FAQ Item</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-30"
                    title="Move Up"
                  >
                    <HiChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === faqs.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-30"
                    title="Move Down"
                  >
                    <HiChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(index)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition ml-2"
                    title="Delete Question"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Question</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => handleUpdateFaq(index, 'question', e.target.value)}
                  placeholder="e.g. How do I apply for jobs?"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Detailed Answer</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => handleUpdateFaq(index, 'answer', e.target.value)}
                  rows={3}
                  placeholder="Enter the answer explanation..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-normal outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add New Question Button */}
        <button
          onClick={handleAddFaq}
          className="w-full py-4 border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50 text-teal-800 font-extrabold rounded-2xl transition flex items-center justify-center gap-2 text-sm"
        >
          <HiPlus className="w-5 h-5 text-teal-600" /> Add New Question & Answer
        </button>
      </div>
    </div>
  );
};

export default AdminFaq;
