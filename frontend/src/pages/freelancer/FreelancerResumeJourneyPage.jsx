import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFreelancer } from '../../context/FreelancerContext';
import {
  ResumeJourneyProvider,
  useResumeJourney,
} from '../../components/freelancer/resume-journey/context/ResumeJourneyContext';
import JourneyStepper from '../../components/freelancer/resume-journey/common/JourneyStepper';
import ResumeCheckStep from '../../components/freelancer/resume-journey/steps/Step1ResumeCheck/ResumeCheckStep';
import PadhaaoStep from '../../components/freelancer/resume-journey/steps/Step2Padhaao/PadhaaoStep';
import PracticeStep from '../../components/freelancer/resume-journey/steps/Step3Practice/PracticeStep';
import TestStep from '../../components/freelancer/resume-journey/steps/Step4Test/TestStep';
import BataDoStep from '../../components/freelancer/resume-journey/steps/Step5BataDo/BataDoStep';

function ResumeJourneyContent() {
  const navigate = useNavigate();
  const { resumeFileInputRef, handleResumeUpload, uploadingResume, profile } = useFreelancer();
  const { activeStep } = useResumeJourney();

  return (
    <div className="space-y-4">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="bg-white border border-[#E6E3F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/freelancer/dashboard')}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#5B6168] bg-[#F6F5FC] border border-[#E6E3F7] rounded-xl py-2 px-3.5 hover:text-[#1B1F23] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Dashboard
          </button>
          <div>
            <h1 className="text-[17px] sm:text-[19px] font-bold text-[#141A33] m-0" style={{ fontFamily: 'Fraunces, serif' }}>
              Resume Journey &amp; Job-Ready Flow
            </h1>
            <p className="text-[12px] text-[#767B8A] mt-0.5 m-0 hidden sm:block">
              Dynamic ATS audit, targeted skill syllabus, practical challenges, and verified hiring readiness
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            ref={resumeFileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleResumeUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => resumeFileInputRef.current?.click()}
            disabled={uploadingResume}
            className="flex-1 sm:flex-initial py-2 px-4 rounded-xl text-[12.5px] font-semibold bg-[#5B21D6] text-white hover:bg-[#4A3AE0] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {uploadingResume ? 'Uploading...' : '📄 Upload New Resume (PDF)'}
          </button>
          {profile?.resumeUrl && (
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-3.5 rounded-xl text-[12.5px] font-semibold text-[#5B21D6] bg-[#F0EDFC] hover:bg-[#E4DFFB] transition-colors cursor-pointer whitespace-nowrap"
            >
              ⬇️ Download Current
            </a>
          )}
        </div>
      </div>

      {/* 5-Step Progress Header */}
      <JourneyStepper />

      {/* Dynamic Active Step Body */}
      <div className="transition-all duration-200">
        {activeStep === 1 && <ResumeCheckStep />}
        {activeStep === 2 && <PadhaaoStep />}
        {activeStep === 3 && <PracticeStep />}
        {activeStep === 4 && <TestStep />}
        {activeStep === 5 && <BataDoStep />}
      </div>
    </div>
  );
}

export default function FreelancerResumeJourneyPage() {
  return (
    <ResumeJourneyProvider>
      <ResumeJourneyContent />
    </ResumeJourneyProvider>
  );
}
