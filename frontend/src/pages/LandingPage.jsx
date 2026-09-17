import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { providerAPI } from '../services/api';
import Seo from '../components/common/Seo';
import toast from 'react-hot-toast';

import HomeHeroSection from '../components/home/HomeHeroSection';
import HomeFreelancersSection from '../components/home/HomeFreelancersSection';
import HomeHowItWorksSection from '../components/home/HomeHowItWorksSection';
import HomePricingSection from '../components/home/HomePricingSection';
import HomeJobReadySection from '../components/home/HomeJobReadySection';
import HomeTrustSection from '../components/home/HomeTrustSection';
import CandidateModal from '../components/landing/CandidateModal';

const DEFAULT_STATS = {
  totalFreelancersListed: "6,200+",
  totalRequirementsPosted: "1,800+",
  avgResponseTime: "~12 min",
  avgRating: "4.7★"
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [freelancers, setFreelancers] = useState([]);
  const [isLoadingTalent, setIsLoadingTalent] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [platformStats, setPlatformStats] = useState(DEFAULT_STATS);

  // Fetch freelancers from backend API
  const fetchTalent = useCallback(async (cat = 'all') => {
    setIsLoadingTalent(true);
    try {
      const params = { limit: 12 };
      if (cat && cat !== 'all') {
        params.category = cat;
      }
      const res = await providerAPI.getTopTalent(params);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setFreelancers(res.data.data);
        if (res.data.meta) {
          setPlatformStats((prev) => ({
            ...prev,
            ...res.data.meta,
          }));
        }
      }
    } catch (err) {
      console.warn('[HOME] Error fetching top talent:', err);
    } finally {
      setIsLoadingTalent(false);
    }
  }, []);

  useEffect(() => {
    fetchTalent(activeCategory);
  }, [activeCategory, fetchTalent]);

  // Handle category change
  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
  };

  // Handle Hero Search submission
  const handleHeroSearch = ({ skill, budget, location }) => {
    const params = new URLSearchParams();
    if (skill) params.append('query', skill);
    if (budget && budget !== 'Any budget') params.append('budget', budget);
    if (location && location !== 'Remote') params.append('location', location);

    if (user?.activeRole === 'provider') {
      navigate(`/provider/job-for-me?${params.toString()}`);
    } else {
      navigate(`/search?${params.toString()}`);
    }
  };

  // Handle "Get Listed as a Freelancer"
  const handleListAsFreelancer = () => {
    if (isAuthenticated) {
      if (user?.activeRole === 'provider') {
        navigate('/provider/profile');
      } else {
        toast.success("Welcome back! Explore freelance opportunities or update your role.");
        navigate('/provider/dashboard');
      }
    } else {
      navigate('/signup?role=provider');
    }
  };

  // Handle message click
  const handleMessageFreelancer = (candidate) => {
    if (!isAuthenticated) {
      toast("Please log in or post your requirement to message this freelancer.", { icon: '💬' });
      navigate('/login');
      return;
    }
    // If logged in, open CandidateModal for messaging / WhatsApp connection
    setSelectedCandidate(candidate);
  };

  // Handle scroll to hero or post requirement
  const handleScrollToPost = () => {
    if (isAuthenticated && user?.activeRole === 'recruiter') {
      navigate('/recruiter/post-job');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-white font-inter text-[#1C1733] overflow-x-hidden min-h-screen">
      <Seo
        title="LucoHire — Hire Verified Freelancers Online | Post Freelance Jobs Free in India"
        description="LucoHire is India's trusted platform to hire verified freelancers online or find freelance jobs that actually pay. Post a requirement for free and get matched instantly with skilled freelancers in design, development, content writing, video editing, marketing and more."
        canonicalPath="/"
      />

      {/* 1. Hero Section */}
      <HomeHeroSection
        onSearch={handleHeroSearch}
        onListAsFreelancer={handleListAsFreelancer}
        stats={platformStats}
      />

      {/* 2. Freelancer Cards Section */}
      <HomeFreelancersSection
        freelancers={freelancers}
        isLoading={isLoadingTalent}
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
        onViewProfile={(candidate) => setSelectedCandidate(candidate)}
        onMessageFreelancer={handleMessageFreelancer}
      />

      {/* 3. How LucoHire Works: Persona Cards (For Freelancers & For Clients) */}
      <HomeHowItWorksSection
        onScrollToPost={handleScrollToPost}
      />

      {/* 4. Pricing Section (Interactive Tabs & Free vs Worth-It comparison) */}
      <HomePricingSection />

      {/* 5. Your Path to Job-Ready (5-step progressive path) */}
      <HomeJobReadySection />

      {/* 6. Why LucoHire Trust Metrics */}
      <HomeTrustSection
        stats={{
          responseRate: '98%',
          avgResponseTime: platformStats.avgResponseTime || '~12 min',
          avgRating: platformStats.avgRating || '4.7★'
        }}
      />

      {/* Detailed Candidate Modal (Opens on 'View Profile' click) */}
      <CandidateModal
        selectedCandidate={selectedCandidate}
        setSelectedCandidate={setSelectedCandidate}
      />
    </div>
  );
}