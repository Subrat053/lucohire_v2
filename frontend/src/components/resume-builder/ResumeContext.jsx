import React, { createContext, useContext, useState, useEffect } from 'react';

export const ResumeContext = createContext();

export function ResumeProvider({ children, initialProfileData }) {
  // We transform the profileData into an array of sections that can be reordered
  const [resumeData, setResumeData] = useState({
    personal: {
      name: '',
      designation: '',
      email: '',
      phone: '',
      city: '',
      photo: '',
      links: []
    },
    sections: []
  });

  const [activeElementId, setActiveElementId] = useState(null);

  // Initialize from profileData
  useEffect(() => {
    if (!initialProfileData) return;
    
    // Map existing portfolio links
    const links = (initialProfileData.portfolioLinks || [])
      .filter(l => l.status === 'approved' || !l.status)
      .map(l => ({ platform: l.platform, url: l.url }));

    const photoUrl = initialProfileData.photo || initialProfileData.profilePhoto || initialProfileData.user?.profilePhotoApproval?.pendingUrl || '';

    // Standard ATS-friendly sections
    const defaultSections = [
      {
        id: 'summary',
        type: 'summary',
        title: 'Professional Summary',
        visible: true,
        data: { text: initialProfileData.description || '' }
      },
      {
        id: 'experience',
        type: 'experience',
        title: 'Work Experience',
        visible: true,
        data: (initialProfileData.previousExperience || []).map((exp, i) => ({
          id: `exp-${i}`,
          company: exp.company || '',
          role: exp.role || '',
          duration: exp.duration || '',
          description: exp.description || ''
        }))
      },
      {
        id: 'education',
        type: 'education',
        title: 'Education',
        visible: true,
        data: (initialProfileData.education || []).map((edu, i) => ({
          id: `edu-${i}`,
          institution: edu.institution || '',
          degree: edu.degree || '',
          year: edu.year || '',
          grade: edu.grade || '',
          coursework: ''
        }))
      },
      {
        id: 'projects',
        type: 'projects',
        title: 'Projects',
        visible: true,
        data: (initialProfileData.projects || []).map((proj, i) => ({
          id: `proj-${i}`,
          name: proj.name || '',
          description: proj.description || '',
          link: proj.link || '',
          githubLink: '',
          duration: ''
        }))
      },
      {
        id: 'skills',
        type: 'skills',
        title: 'Skills',
        visible: true,
        data: [
          {
            id: 'skills-cat-1',
            category: 'Core Skills',
            items: (initialProfileData.skills || []).map(s => typeof s === 'string' ? s : s.name).join(', ')
          }
        ]
      },
      {
        id: 'certifications',
        type: 'certifications',
        title: 'Certifications',
        visible: (initialProfileData.certifications || []).length > 0,
        data: (initialProfileData.certifications || []).map((cert, i) => ({
          id: `cert-${i}`,
          name: cert.name || '',
          issuer: cert.issuer || '',
          date: cert.date || ''
        }))
      },
      {
        id: 'achievements',
        type: 'achievements',
        title: 'Achievements',
        visible: (initialProfileData.achievements || []).length > 0,
        data: (initialProfileData.achievements || []).map((ach, i) => ({
          id: `ach-${i}`,
          title: ach.title || '',
          description: ach.description || ''
        }))
      }
    ];

    setResumeData({
      personal: {
        name: initialProfileData.profileName || '',
        designation: initialProfileData.designation || '',
        email: initialProfileData.email || '',
        phone: initialProfileData.phone || '',
        city: initialProfileData.city || '',
        photo: photoUrl,
        links: links
      },
      sections: defaultSections
    });
  }, [initialProfileData]);

  const updatePersonal = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  const updateSectionTitle = (sectionId, newTitle) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId ? { ...sec, title: newTitle } : sec
      )
    }));
  };

  const toggleSectionVisibility = (sectionId) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId ? { ...sec, visible: !sec.visible } : sec
      )
    }));
  };

  const updateSectionData = (sectionId, newData) => {
    setResumeData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId ? { ...sec, data: newData } : sec
      )
    }));
  };

  const reorderSections = (startIndex, endIndex) => {
    setResumeData(prev => {
      const result = Array.from(prev.sections);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, sections: result };
    });
  };

  const moveSection = (sectionId, direction) => {
    setResumeData(prev => {
      const index = prev.sections.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.sections.length) return prev;
      
      const newSections = [...prev.sections];
      const temp = newSections[index];
      newSections[index] = newSections[newIndex];
      newSections[newIndex] = temp;
      
      return { ...prev, sections: newSections };
    });
  };

  return (
    <ResumeContext.Provider value={{
      resumeData,
      setResumeData,
      updatePersonal,
      updateSectionTitle,
      toggleSectionVisibility,
      updateSectionData,
      reorderSections,
      moveSection,
      activeElementId,
      setActiveElementId
    }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  return useContext(ResumeContext);
}
