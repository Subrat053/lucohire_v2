import { useLanguage } from '../context/LanguageContext';

const useTranslation = () => {
  const {
    t,
    selectedLanguage,
    language,
    languages,
    changeLanguage,
    setSelectedLanguage,
    translateText,
    translateBatch,
    loading,
    isRTL,
  } = useLanguage();

  return {
    t,
    selectedLanguage: selectedLanguage || language,
    language: selectedLanguage || language,
    languages,
    changeLanguage,
    setSelectedLanguage,
    translateText,
    translateBatch,
    loading,
    isRTL,
  };
};

export default useTranslation;
