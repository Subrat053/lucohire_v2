import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useResume } from './ResumeContext';
import InlineFormBlock, { FormInput, FormTextarea } from './InlineFormBlock';

const Show = ({ when, children }) => (when ? children : null);

const AddItemButton = ({ onClick, label }) => (
  <button 
    type="button"
    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 p-2 w-full rounded-lg transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
    onClick={onClick}
    title={label}
  >
    <Plus className="w-3.5 h-3.5" /> {label}
  </button>
);

export default function QuinnTemplate() {
  const { resumeData, updatePersonal, updateSectionData, updateSectionTitle, moveSection } = useResume();
  const { personal, sections } = resumeData;

  const handleArrayChange = (sectionId, dataArray, index, field, value) => {
    const newData = [...dataArray];
    newData[index] = { ...newData[index], [field]: value };
    updateSectionData(sectionId, newData);
  };

  const moveItem = (sectionId, dataArray, index, dir) => {
    if (index + dir < 0 || index + dir >= dataArray.length) return;
    const newData = [...dataArray];
    const temp = newData[index];
    newData[index] = newData[index + dir];
    newData[index + dir] = temp;
    updateSectionData(sectionId, newData);
  };

  const renderSectionContent = (section) => {
    switch (section.type) {
      case 'summary':
        return (
          <InlineFormBlock
            renderPreview={() => (
              <div className="text-[14px] leading-relaxed text-[var(--resume-sub)] text-justify whitespace-pre-wrap">
                {section.data?.text || "Add Professional Summary..."}
              </div>
            )}
            renderForm={() => (
              <FormTextarea 
                label="Professional Summary" 
                value={section.data?.text} 
                onChange={(v) => updateSectionData(section.id, { text: v })} 
              />
            )}
            isDraggable={false}
          />
        );
      
      case 'experience':
        return (
          <div className="flex flex-col gap-2.5 group">
            {section.data.map((exp, i) => (
              <InlineFormBlock
                key={exp.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end gap-4">
                      <h3 className="font-bold text-[15px] text-[var(--resume-main)] flex-1 min-w-0">
                        {exp.role || "Job Title"}
                      </h3>
                      <Show when={exp.duration}>
                        <div className="text-[13.5px] font-medium text-[var(--resume-muted)] italic">{exp.duration}</div>
                      </Show>
                    </div>
                    <Show when={exp.company}>
                      <div className="text-[14px] font-semibold text-[var(--resume-muted)]">{exp.company}</div>
                    </Show>
                    <Show when={exp.description}>
                      <div className="text-[13.5px] leading-relaxed text-[var(--resume-sub)] whitespace-pre-wrap pl-4 relative before:content-[''] before:absolute before:left-1 before:top-2 before:w-1 before:h-1 before:bg-[var(--resume-accent)] before:rounded-full">
                        {exp.description}
                      </div>
                    </Show>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Job Title" value={exp.role} onChange={v => handleArrayChange(section.id, section.data, i, 'role', v)} />
                    <FormInput label="Company Name & Location" value={exp.company} onChange={v => handleArrayChange(section.id, section.data, i, 'company', v)} />
                    <FormInput label="Duration (e.g. Jan 2020 - Present)" value={exp.duration} onChange={v => handleArrayChange(section.id, section.data, i, 'duration', v)} />
                    <FormTextarea label="Description" value={exp.description} onChange={v => handleArrayChange(section.id, section.data, i, 'description', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Work Experience" onClick={() => updateSectionData(section.id, [...section.data, { id: `exp-${Date.now()}`, role: 'New Role', company: '', duration: '', description: '' }])} />
          </div>
        );

      case 'education':
        return (
          <div className="flex flex-col gap-2.5 group">
            {section.data.map((edu, i) => (
              <InlineFormBlock
                key={edu.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-end gap-4">
                      <h3 className="font-bold text-[15px] text-[var(--resume-main)] flex-1 min-w-0">
                        {edu.degree || "Degree Name"}
                      </h3>
                      <Show when={edu.year}>
                        <div className="text-[13.5px] font-medium text-[var(--resume-muted)] italic">{edu.year}</div>
                      </Show>
                    </div>
                    <div className="flex justify-between items-center text-[14px] text-[var(--resume-muted)]">
                      <Show when={edu.institution}>
                        <span className="font-semibold">{edu.institution}</span>
                      </Show>
                      <Show when={edu.grade}>
                        <span className="italic">{edu.grade}</span>
                      </Show>
                    </div>
                    <Show when={edu.coursework}>
                      <div className="text-[13px] text-[var(--resume-light)] italic mt-1">
                        Relevant Coursework: {edu.coursework}
                      </div>
                    </Show>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Degree / Program" value={edu.degree} onChange={v => handleArrayChange(section.id, section.data, i, 'degree', v)} />
                    <FormInput label="Institution & Location" value={edu.institution} onChange={v => handleArrayChange(section.id, section.data, i, 'institution', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="Graduation Year" value={edu.year} onChange={v => handleArrayChange(section.id, section.data, i, 'year', v)} />
                      <FormInput label="CGPA / Score" value={edu.grade} onChange={v => handleArrayChange(section.id, section.data, i, 'grade', v)} />
                    </div>
                    <FormInput label="Relevant Coursework" value={edu.coursework} onChange={v => handleArrayChange(section.id, section.data, i, 'coursework', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Education" onClick={() => updateSectionData(section.id, [...section.data, { id: `edu-${Date.now()}`, degree: 'New Degree', institution: '', year: '', grade: '' }])} />
          </div>
        );

      case 'projects':
        return (
          <div className="flex flex-col gap-2.5 group">
            {section.data.map((proj, i) => (
              <InlineFormBlock
                key={proj.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-end gap-4">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <h3 className="font-bold text-[15px] text-[var(--resume-main)]">{proj.name || "Project Name"}</h3>
                        <Show when={proj.liveUrl}>
                          <span className="text-[13px] text-[var(--resume-link)] underline">
                            <a onClick={(e) => e.stopPropagation()} href={proj.liveUrl?.startsWith('http') ? proj.liveUrl : `https://${proj.liveUrl}`} target="_blank" rel="noreferrer">
                              Live Demo
                            </a>
                          </span>
                        </Show>
                        <Show when={proj.githubUrl}>
                          <span className="text-[13px] text-[var(--resume-lighter)] underline">
                            <a onClick={(e) => e.stopPropagation()} href={proj.githubUrl?.startsWith('http') ? proj.githubUrl : `https://${proj.githubUrl}`} target="_blank" rel="noreferrer">
                              GitHub
                            </a>
                          </span>
                        </Show>
                      </div>
                      <Show when={proj.duration}>
                        <div className="text-[13.5px] font-medium text-[var(--resume-muted)] italic">{proj.duration}</div>
                      </Show>
                    </div>
                    <Show when={proj.technologies}>
                      <div className="text-[13px] text-[var(--resume-light)] font-medium">
                        <span className="text-[var(--resume-sub)]">Technologies:</span> {proj.technologies}
                      </div>
                    </Show>
                    <Show when={proj.description}>
                      <div className="text-[13.5px] leading-relaxed text-[var(--resume-sub)] whitespace-pre-wrap pl-4 relative before:content-[''] before:absolute before:left-1 before:top-2 before:w-1 before:h-1 before:bg-[var(--resume-accent)] before:rounded-full mt-1">
                        {proj.description}
                      </div>
                    </Show>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Project Name" value={proj.name} onChange={v => handleArrayChange(section.id, section.data, i, 'name', v)} />
                    <FormInput label="Duration" value={proj.duration} onChange={v => handleArrayChange(section.id, section.data, i, 'duration', v)} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="GitHub URL" value={proj.githubUrl || proj.link} onChange={v => handleArrayChange(section.id, section.data, i, 'githubUrl', v)} />
                      <FormInput label="Live Demo URL" value={proj.liveUrl} onChange={v => handleArrayChange(section.id, section.data, i, 'liveUrl', v)} />
                    </div>
                    <FormInput label="Technologies Used" value={proj.technologies} onChange={v => handleArrayChange(section.id, section.data, i, 'technologies', v)} />
                    <FormTextarea label="Description" value={proj.description} onChange={v => handleArrayChange(section.id, section.data, i, 'description', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Project" onClick={() => updateSectionData(section.id, [...section.data, { id: `proj-${Date.now()}`, name: 'New Project', description: '' }])} />
          </div>
        );

      case 'skills':
        return (
          <div className="flex flex-col gap-1.5 group">
            {section.data.map((cat, i) => (
              <InlineFormBlock
                key={cat.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="text-[14px] leading-relaxed flex gap-2">
                    <span className="font-bold text-[var(--resume-main)] shrink-0">{cat.category || "Category"}:</span>
                    <span className="text-[var(--resume-sub)] flex-1 min-w-0">{cat.items || "Click to add skills..."}</span>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Category (e.g. Languages)" value={cat.category} onChange={v => handleArrayChange(section.id, section.data, i, 'category', v)} />
                    <FormTextarea label="Skills (comma separated)" value={cat.items} onChange={v => handleArrayChange(section.id, section.data, i, 'items', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label="Add Skill Category" onClick={() => updateSectionData(section.id, [...section.data, { id: `sk-${Date.now()}`, category: 'New Category', items: '' }])} />
          </div>
        );
        
      case 'certifications':
      case 'achievements':
        return (
          <div className="flex flex-col gap-2 group">
            {section.data.map((item, i) => (
              <InlineFormBlock
                key={item.id}
                onDelete={() => updateSectionData(section.id, section.data.filter((_, idx) => idx !== i))}
                onMoveUp={() => moveItem(section.id, section.data, i, -1)}
                onMoveDown={() => moveItem(section.id, section.data, i, 1)}
                renderPreview={() => (
                  <div className="flex gap-2 text-[14px] leading-relaxed">
                    <span className="text-[var(--resume-sub)] flex-1 min-w-0">
                      <span className="font-bold text-[var(--resume-main)] mr-1.5">{item.name || item.title || "Item Name"}</span>
                      <Show when={item.issuer || item.description}>
                        - <span className="ml-1.5 text-[var(--resume-muted)] italic">{item.issuer || item.description}</span>
                      </Show>
                    </span>
                    <Show when={item.date}>
                      <span className="text-[var(--resume-muted)] italic">{item.date}</span>
                    </Show>
                  </div>
                )}
                renderForm={() => (
                  <>
                    <FormInput label="Name / Title" value={item.name || item.title} onChange={(v) => {
                      if (item.name !== undefined) handleArrayChange(section.id, section.data, i, 'name', v);
                      else handleArrayChange(section.id, section.data, i, 'title', v);
                    }} />
                    <FormInput label="Issuer / Details" value={item.issuer || item.description} onChange={(v) => {
                      if (item.issuer !== undefined) handleArrayChange(section.id, section.data, i, 'issuer', v);
                      else handleArrayChange(section.id, section.data, i, 'description', v);
                    }} />
                    <FormInput label="Date" value={item.date} onChange={v => handleArrayChange(section.id, section.data, i, 'date', v)} />
                  </>
                )}
              />
            ))}
            <AddItemButton label={`Add ${section.type === 'certifications' ? 'Certification' : 'Achievement'}`} onClick={() => {
              const isCert = section.type === 'certifications';
              updateSectionData(section.id, [...section.data, { id: `itm-${Date.now()}`, ...(isCert ? { name: 'New Certification', issuer: '', date: '' } : { title: 'New Achievement', description: '' }) }]);
            }} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`bg-[#ffffff] px-10 py-8 text-[var(--resume-main)] grow w-full box-border break-words theme-${themeId}`}
      style={{ fontFamily: 'var(--resume-font, "Georgia", "Times New Roman", serif)', wordBreak: 'break-word', overflowWrap: 'break-word' }}
    >
      {/* Header */}
      <div className="mb-4 pb-3">
        <InlineFormBlock
          isDraggable={false}
          renderPreview={() => (
            <div className="text-center">
              <h1 className="text-[42px] leading-tight font-bold tracking-normal mb-1 text-[var(--resume-main)] capitalize">
                {personal.name || "YOUR NAME"}
              </h1>
              
              <div className="border-b-[3px] border-[var(--resume-main)] my-2"></div>
              
              <Show when={personal.role}>
                <div className="text-[14px] font-bold text-[#000] mb-2 uppercase tracking-wide flex justify-center gap-4">
                  {personal.role.split(',').map((r, i) => (
                    <span key={i} className="flex items-center gap-4">
                      {r.trim()}
                      {i < personal.role.split(',').length - 1 && <span className="text-[var(--resume-main)]">|</span>}
                    </span>
                  ))}
                </div>
              </Show>

              <div className="flex justify-center flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[#000] font-medium">
                <Show when={personal.phone}><span>{personal.phone}</span></Show>
                <Show when={personal.phone && personal.email}><span>|</span></Show>
                <Show when={personal.email}><span>{personal.email}</span></Show>
                <Show when={(personal.phone || personal.email) && personal.city}><span>|</span></Show>
                <Show when={personal.city}><span>{personal.city}</span></Show>

                {personal.links?.map((link, i) => (
                  <Show when={link.url} key={i}>
                    <span>|</span>
                    <a onClick={(e) => e.stopPropagation()} href={link.url?.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-[#000] hover:underline">
                      {link.platform || link.url.replace(/^https?:\/\//, '')}
                    </a>
                  </Show>
                ))}
              </div>
            </div>
          )}
          renderForm={() => (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><FormInput label="Full Name" value={personal.name} onChange={v => updatePersonal('name', v)} /></div>
              <div className="col-span-2"><FormInput label="Target Roles (comma separated)" value={personal.role} onChange={v => updatePersonal('role', v)} /></div>
              <FormInput label="Email" value={personal.email} onChange={v => updatePersonal('email', v)} />
              <FormInput label="Phone" value={personal.phone} onChange={v => updatePersonal('phone', v)} />
              <div className="col-span-2"><FormInput label="City, Country" value={personal.city} onChange={v => updatePersonal('city', v)} /></div>
              <div className="col-span-2 pt-2 border-t border-emerald-200">
                <label className="text-xs font-bold text-[var(--resume-muted)] uppercase tracking-wider block mb-2">Custom Links</label>
                {(personal.links || []).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start font-sans">
                    <input value={link.platform} onChange={(e) => { const nl = [...personal.links]; nl[i].platform = e.target.value; updatePersonal('links', nl); }} placeholder="Platform (e.g. LinkedIn)" className="w-1/3 px-2 py-1.5 border border-emerald-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <input value={link.url} onChange={(e) => { const nl = [...personal.links]; nl[i].url = e.target.value; updatePersonal('links', nl); }} placeholder="URL" className="w-full px-2 py-1.5 border border-emerald-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <button type="button" onClick={() => updatePersonal('links', personal.links.filter((_, idx) => idx !== i))} className="p-1.5 text-red-700 hover:bg-red-50 rounded bg-[#ffffff]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => updatePersonal('links', [...(personal.links || []), { platform: '', url: '' }])} className="text-emerald-700 text-sm font-bold flex items-center gap-1 hover:text-emerald-800">
                  <Plus className="w-4 h-4" /> Add Link
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Dynamic Sections */}
      <div className="flex flex-col gap-3">
        {sections.map((section, sIdx) => {
          // If section is entirely empty and we're not adding items, we still need to render the section header so they can add items!
          // But maybe only if it has an array.
          const isEmptySection = !section.data || (Array.isArray(section.data) && section.data.length === 0) || (section.type === 'summary' && !section.data.text);
          
          return (
            <div key={section.id} className="mb-1 group">
              <InlineFormBlock
                isDraggable={true}
                onMoveUp={() => { if (sIdx > 0) moveSection(section.id, -1); }}
                onMoveDown={() => { if (sIdx < sections.length - 1) moveSection(section.id, 1); }}
                renderPreview={() => (
                  <h2 className="text-[14.5px] font-bold uppercase tracking-widest text-[var(--resume-main)] border-b-[1px] border-[var(--resume-main)] pb-1 mb-2">
                    {section.title || "SECTION TITLE"}
                  </h2>
                )}
                renderForm={() => (
                  <FormInput label="Section Title" value={section.title} onChange={v => updateSectionTitle(section.id, v)} /> 
                )}
              />
              {renderSectionContent(section)}
            </div>
          );
        })}
      </div>
    </div>
  );
}


