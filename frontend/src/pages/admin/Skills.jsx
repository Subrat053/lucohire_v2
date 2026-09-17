import { useState, useEffect } from 'react';
import { HiPlus, HiPencil, HiTrash, HiX, HiCheck, HiChevronDown, HiChevronRight, HiEye, HiEyeOff } from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const TIERS = ['unskilled', 'semi-skilled', 'skilled'];
const TIER_META = {
  unskilled:     { label: 'Unskilled',    color: 'bg-amber-100 text-amber-800 border-amber-200' },
  'semi-skilled':{ label: 'Semi-Skilled', color: 'bg-indigo-100 text-blue-800 border-indigo-200' },
  skilled:       { label: 'Skilled',      color: 'bg-green-100 text-green-800 border-green-200' },
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4">
      <p className="text-stone-700 text-sm mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-xl text-sm hover:bg-stone-50 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

const ToggleStatusModal = ({ category, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-96 mx-4">
        <h3 className="text-lg font-bold text-stone-800 mb-3">Deactivate Category</h3>
        <p className="text-stone-600 text-sm mb-4">Are you sure you want to deactivate "{category.name}"? Providers will not be able to select this category.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for deactivation (optional)"
          className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none mb-5 h-20 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-stone-200 text-stone-600 py-2 rounded-xl text-sm hover:bg-stone-50 transition">Cancel</button>
          <button onClick={() => onConfirm(reason)} className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-sm hover:bg-amber-600 transition">Deactivate</button>
        </div>
      </div>
    </div>
  );
};

const AdminSkills = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});       // { catId: bool }
  const [confirm, setConfirm] = useState(null);       // { type, payload }
  const [toggleModal, setToggleModal] = useState(null); // category to deactivate

  // ?"??"? Category form state
  const [catForm, setCatForm] = useState({ name: '', tier: 'unskilled', icon: '⭐', sortOrder: 0 });
  const [editingCat, setEditingCat] = useState(null); // category being edited

  // ?"??"? Per-category new skill input
  const [newSkillInputs, setNewSkillInputs] = useState({});    // { catId: value }

  // ?"??"? Inline skill rename
  const [renamingSkill, setRenamingSkill] = useState(null);    // { catId, skillId, name }

  // ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?
  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getSkillCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load skill categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ?"??"? Category CRUD ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return toast.error('Category name required');
    try {
      const slug = catForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await adminAPI.createSkillCategory({ ...catForm, slug });
      toast.success('Category created');
      setCatForm({ name: '', tier: 'unskilled', icon: '⭐', sortOrder: 0 });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const startEditCat = (cat) => {
    setEditingCat({ id: cat._id, name: cat.name, tier: cat.tier, icon: cat.icon, sortOrder: cat.sortOrder });
  };

  const saveEditCat = async () => {
    if (!editingCat?.name.trim()) return toast.error('Name required');
    try {
      await adminAPI.updateSkillCategory(editingCat.id, {
        name: editingCat.name, tier: editingCat.tier, icon: editingCat.icon,
        sortOrder: Number(editingCat.sortOrder),
      });
      toast.success('Category updated');
      setEditingCat(null);
      fetchCategories();
    } catch {
      toast.error('Failed to update category');
    }
  };

  const confirmDeleteCat = (cat) => {
    setConfirm({
      message: `Delete category "${cat.name}" and all its skills? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteSkillCategory(cat._id);
          toast.success('Category deleted');
          setConfirm(null);
          fetchCategories();
        } catch (err) {
          toast.error('Failed to delete category');
          setConfirm(null);
        }
      },
    });
  };

  const handleToggleCategoryStatus = async (cat, reason = '') => {
    try {
      const isActive = cat.isActive === false ? true : false;
      await adminAPI.updateSkillCategoryStatus(cat._id, { isActive, reason });
      toast.success(`Category ${isActive ? 'activated' : 'deactivated'}`);
      setToggleModal(null);
      fetchCategories();
    } catch (err) {
      toast.error('Failed to update category status');
    }
  };

  // ?"??"? Skill CRUD within category ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?
  const addSkill = async (catId) => {
    const name = (newSkillInputs[catId] || '').trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    try {
      await adminAPI.addSkillToCategory(catId, { name, slug });
      toast.success(`"${name}" added`);
      setNewSkillInputs((p) => ({ ...p, [catId]: '' }));
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Skill already exists or invalid');
    }
  };

  const confirmDeleteSkill = (cat, skill) => {
    setConfirm({
      message: `Remove skill "${skill.name}" from "${cat.name}"?`,
      onConfirm: async () => {
        try {
          await adminAPI.removeSkillFromCategory(cat._id, skill._id);
          toast.success('Skill removed');
          setConfirm(null);
          fetchCategories();
        } catch {
          toast.error('Failed to remove skill');
          setConfirm(null);
        }
      },
    });
  };

  // ?"??"? Toggle skill active/inactive via a quick update ?"??"??"??"?
  const toggleSkillActive = async (cat, skill) => {
    // Use update category endpoint to toggle skill via re-adding approach
    // Instead, we update skill via category update with patched skills array
    try {
      const updatedSkills = cat.skills.map((s) =>
        s._id === skill._id ? { ...s, isActive: !s.isActive } : s
      );
      await adminAPI.updateSkillCategory(cat._id, { skills: updatedSkills });
      fetchCategories();
    } catch {
      toast.error('Failed to toggle skill');
    }
  };

  // ?"??"? Stats ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"?
  const totalSkills = categories.reduce((acc, c) => acc + (c.skills?.length || 0), 0);
  const activeSkills = categories.reduce((acc, c) => acc + (c.skills?.filter((s) => s.isActive !== false).length || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toggleModal && (
        <ToggleStatusModal
          category={toggleModal}
          onConfirm={(reason) => handleToggleCategoryStatus(toggleModal, reason)}
          onCancel={() => setToggleModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Skill Categories</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Manage skill catalog ??" <strong>{categories.length}</strong> categories,{ }
            <strong>{activeSkills}</strong> / {totalSkills} active skills
          </p>
        </div>
      </div>

      {/* Tier tabs legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TIERS.map((t) => {
          const count = categories.filter((c) => c.tier === t).length;
          return (
            <span key={t} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${TIER_META[t].color}`}>
              {TIER_META[t].label} ({count} categories)
            </span>
          );
        })}
      </div>

      {/* ?"??"? Add New Category ?"??"? */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">Add New Category</h2>
        <form onSubmit={handleCreateCategory} className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Category Name *</label>
            <input
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Home Repairs"
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Tier *</label>
            <select
              value={catForm.tier}
              onChange={(e) => setCatForm({ ...catForm, tier: e.target.value })}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
            >
              {TIERS.map((t) => <option key={t} value={t}>{TIER_META[t].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Icon (emoji)</label>
            <input
              value={catForm.icon}
              onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
              placeholder="e.g. ?Y?"
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Sort Order</label>
            <input
              type="number"
              value={catForm.sortOrder}
              onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })}
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-700 transition"
          >
            <HiPlus className="w-4 h-4" /> Create Category
          </button>
        </form>
      </div>

      {/* ?"??"? Category List grouped by tier ?"??"? */}
      {TIERS.map((tier) => {
        const tierCats = categories.filter((c) => c.tier === tier);
        if (tierCats.length === 0) return null;
        return (
          <div key={tier} className="mb-6">
            <h3 className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 border ${TIER_META[tier].color}`}>
              {TIER_META[tier].label}
            </h3>

            <div className="space-y-3">
              {tierCats.map((cat) => {
                const isExpanded = expanded[cat._id];
                const isEditing = editingCat?.id === cat._id;
                const activeCount = cat.skills?.filter((s) => s.isActive !== false).length || 0;

                return (
                  <div key={cat._id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${cat.isActive === false ? 'border-red-200 bg-red-50' : 'border-stone-200'}`}>
                    {/* Category header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button type="button" onClick={() => toggleExpand(cat._id)} className="text-stone-400 hover:text-stone-700 shrink-0">
                        {isExpanded ? <HiChevronDown className="w-5 h-5" /> : <HiChevronRight className="w-5 h-5" />}
                      </button>

                      {isEditing ? (
                        /* Inline edit mode */
                        <div className="flex-1 grid sm:grid-cols-4 gap-2 items-center">
                          <input
                            value={editingCat.name}
                            onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                            className="sm:col-span-2 px-3 py-1.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                          <select value={editingCat.tier} onChange={(e) => setEditingCat({ ...editingCat, tier: e.target.value })}
                            className="px-2 py-1.5 border border-stone-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none">
                            {TIERS.map((t) => <option key={t} value={t}>{TIER_META[t].label}</option>)}
                          </select>
                          <input value={editingCat.icon} onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                            placeholder="icon" className="px-2 py-1.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none w-20" />
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <span className={`font-semibold text-sm ${cat.isActive === false ? 'text-red-700 line-through' : 'text-stone-800'}`}>{cat.name}</span>
                            <span className="text-xs text-stone-400 ml-2">({activeCount} skills)</span>
                            {cat.isActive === false && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2 font-bold uppercase">Inactive</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={saveEditCat} title="Save" className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition">
                              <HiCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingCat(null)} title="Cancel" className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition">
                              <HiX className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => {
                              if (cat.isActive === false) handleToggleCategoryStatus(cat);
                              else setToggleModal(cat);
                            }} title={cat.isActive === false ? 'Activate' : 'Deactivate'} className={`p-1.5 rounded-lg transition ${cat.isActive === false ? 'hover:bg-green-50 text-green-500' : 'hover:bg-amber-50 text-stone-400 hover:text-amber-500'}`}>
                              {cat.isActive === false ? <HiEye className="w-4 h-4" /> : <HiEyeOff className="w-4 h-4" />}
                            </button>
                            <button onClick={() => startEditCat(cat)} title="Edit" className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition">
                              <HiPencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => confirmDeleteCat(cat)} title="Delete category" className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition">
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded: skills list */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 bg-stone-50 px-4 py-3">
                        {/* Skill chips */}
                        {cat.skills && cat.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {cat.skills.map((skill) => {
                              const isRenaming = renamingSkill?.catId === cat._id && renamingSkill?.skillId === skill._id;
                              return (
                                <div key={skill._id}
                                  className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium border transition group
                                    ${skill.isActive !== false
                                      ? 'bg-white border-stone-200 text-stone-700 shadow-sm'
                                      : 'bg-stone-100 border-stone-200 text-stone-400 line-through'
                                    }`}
                                >
                                  {isRenaming ? (
                                    <input
                                      autoFocus
                                      value={renamingSkill.name}
                                      onChange={(e) => setRenamingSkill({ ...renamingSkill, name: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          // Update via category update
                                          const updatedSkills = cat.skills.map((s) =>
                                            s._id === skill._id ? { ...s, name: renamingSkill.name } : s
                                          );
                                          adminAPI.updateSkillCategory(cat._id, { skills: updatedSkills })
                                            .then(() => { fetchCategories(); setRenamingSkill(null); })
                                            .catch(() => toast.error('Rename failed'));
                                        }
                                        if (e.key === 'Escape') setRenamingSkill(null);
                                      }}
                                      className="w-24 border-b border-amber-400 outline-none bg-transparent text-xs"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => setRenamingSkill({ catId: cat._id, skillId: skill._id, name: skill.name })}
                                      title="Double-click to rename"
                                      className="cursor-text"
                                    >
                                      {skill.name}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleSkillActive(cat, skill)}
                                    title={skill.isActive !== false ? 'Deactivate' : 'Activate'}
                                    className="w-4 h-4 rounded-full border border-stone-200 flex items-center justify-center hover:border-amber-400 transition"
                                  >
                                    {skill.isActive !== false ? '✓' : '×'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteSkill(cat, skill)}
                                    title="Remove skill"
                                    className="text-stone-300 hover:text-red-700 transition"
                                  >
                                    <HiX className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400 mb-3">No skills yet ??" add one below.</p>
                        )}

                        {/* Add skill to this category */}
                        <div className="flex gap-2">
                          <input
                            value={newSkillInputs[cat._id] || ''}
                            onChange={(e) => setNewSkillInputs((p) => ({ ...p, [cat._id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(cat._id); } }}
                            placeholder="Add skill (e.g. Plumbing) then press Enter"
                            className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => addSkill(cat._id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-700 transition"
                          >
                            <HiPlus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                          Double-click a skill name to rename it. Click ✓ / ✗ to toggle active status.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {categories.length === 0 && (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">?Y",</p>
          <p className="font-semibold text-stone-600">No skill categories yet</p>
          <p className="text-sm mt-1">Use the form above to create your first category.</p>
        </div>
      )}
    </div>
  );
};

export default AdminSkills;
