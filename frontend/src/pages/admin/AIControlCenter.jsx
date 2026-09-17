import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  HiEye,
  HiRefresh,
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiDocumentText,
  HiAdjustments,
  HiChartBar,
} from "react-icons/hi";

const MODELS = [
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Default Free)" },
  { value: "gemini-1.5-flash-lite", label: "Gemini 1.5 Flash-Lite (Low Cost)" },
  { value: "gpt-4o-mini", label: "GPT-4o-mini (Low Cost)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Premium)" },
  { value: "gpt-4o", label: "GPT-4o (Premium)" },
];

const FEATURES = [
  { value: "resume_parser", label: "Resume Parser" },
  { value: "ats_score", label: "ATS Score" },
  { value: "job_match", label: "Job Match" },
  { value: "premium_skill_gap", label: "Premium Skill Gap" },
  { value: "career_gps", label: "Career GPS" },
];

const DEFAULT_PROMPT_FORM = {
  feature_name: "",
  description: "",
  role: "system",
  prompt_template: "",
  model_name: "gemini-1.5-flash",
  temperature: 0.2,
  maxTokens: 800,
  is_active: true,
};

const AIControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("telemetry");

  // Telemetry states
  const [datePreset, setDatePreset] = useState("all"); // all | today | yesterday | this_week | this_month | custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [usageSummary, setUsageSummary] = useState({
    totalRequests: 0,
    totalCostUsd: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
  });
  const [usageByFeature, setUsageByFeature] = useState([]);
  const [demandSnapshots, setDemandSnapshots] = useState([]);

  // Prompt Templates states
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [promptForm, setPromptForm] = useState(DEFAULT_PROMPT_FORM);

  // Auditing states
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [auditFeature, setAuditFeature] = useState("");
  const [auditStatus, setAuditStatus] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [rerunningIds, setRerunningIds] = useState(new Set());

  const fetchTelemetry = async () => {
    try {
      const params = {
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
      };
      const [usageRes, demandRes] = await Promise.all([
        adminAPI.getAIUsageDashboard(params),
        adminAPI.getDemandSnapshots(params),
      ]);
      setUsageSummary(usageRes.data?.summary || usageSummary);
      setUsageByFeature(usageRes.data?.byFeature || []);
      setDemandSnapshots(demandRes.data?.items || []);
    } catch (err) {
      console.error("Failed to load telemetry", err);
    }
  };

  const fetchPromptTemplates = async () => {
    try {
      const res = await adminAPI.getPromptTemplates();
      setPromptTemplates(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load prompt templates", err);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    try {
      const res = await adminAPI.getAiAnalysisResults({
        page,
        limit: 15,
        feature_name: auditFeature || undefined,
        status: auditStatus || undefined,
      });
      if (res.data?.success) {
        setAuditLogs(res.data.items || []);
        setAuditTotal(res.data.total || 0);
        setAuditPage(res.data.page || 1);
        setAuditPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchTelemetry(), fetchPromptTemplates(), fetchAuditLogs(1)]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [datePreset, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs(1);
  }, [auditFeature, auditStatus]);

  const handleEditPrompt = (template) => {
    setEditingPrompt(template);
    setPromptForm({
      feature_name: template.feature_name || template.key || "",
      description: template.description || "",
      role: template.role || "system",
      prompt_template: template.prompt_template || template.template || "",
      model_name: template.model_name || "gemini-1.5-flash",
      temperature: template.temperature ?? 0.2,
      maxTokens: template.maxTokens ?? 800,
      is_active: template.is_active ?? template.isActive ?? true,
    });
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setPromptForm(DEFAULT_PROMPT_FORM);
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    try {
      if (editingPrompt) {
        await adminAPI.updatePromptTemplate(editingPrompt._id, promptForm);
        toast.success("Prompt template updated successfully!");
      } else {
        await adminAPI.createPromptTemplate(promptForm);
        toast.success("Prompt template created successfully!");
      }
      handleCancelEdit();
      fetchPromptTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save template");
    }
  };

  const handleRerun = async (audit) => {
    if (rerunningIds.has(audit._id)) return;

    setRerunningIds((prev) => {
      const next = new Set(prev);
      next.add(audit._id);
      return next;
    });

    const loadId = toast.loading("Bypassing cache and re-running AI analysis...");
    try {
      const res = await adminAPI.rerunAiAnalysis({ analysisId: audit._id });
      if (res.data?.success) {
        toast.success("Analysis completed successfully!", { id: loadId });
        fetchAuditLogs(auditPage);
        fetchTelemetry();
      } else {
        toast.error(res.data?.message || "Re-run analysis failed", { id: loadId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Re-run analysis failed", { id: loadId });
    } finally {
      setRerunningIds((prev) => {
        const next = new Set(prev);
        next.delete(audit._id);
        return next;
      });
    }
  };

  const calculateCacheSavings = () => {
    const usdSavings = usageByFeature.reduce((acc, curr) => acc + (curr.requests || 0), 0) * 0.0005;
    return (usdSavings * 86.5).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <LoadingSpinner size="lg" text="Loading AI Operations Control Center..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-violet-600 animate-pulse inline-block" />
              AI Operations Command Center
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Audit AI pipeline steps, tweak models/prompts, inspect cost logs, and monitor token caches.
            </p>
          </div>
          <button
            onClick={() => loadAll()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm transition-all text-sm self-start cursor-pointer"
          >
            <HiRefresh className="h-4 w-4" />
            Refresh Telemetry
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "telemetry"
                ? "border-violet-600 text-violet-700 bg-violet-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <HiChartBar className="h-4 w-4" />
            Usage Telemetry
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "prompts"
                ? "border-violet-600 text-violet-700 bg-violet-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <HiAdjustments className="h-4 w-4" />
            Prompt Templates
          </button>
          <button
            onClick={() => setActiveTab("audits")}
            className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audits"
                ? "border-violet-600 text-violet-700 bg-violet-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <HiDocumentText className="h-4 w-4" />
            AI Pipeline Audits
          </button>
        </div>

        {/* 1. Usage Telemetry Tab */}
        {activeTab === "telemetry" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Date-based Expenses & Usage Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Time Period:</span>
                {[
                  { id: 'all', label: 'All Dates' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDatePreset(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      datePreset === item.id
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 font-medium">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 font-medium">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-violet-350 transition-all">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total AI Calls</span>
                <span className="text-3xl font-extrabold text-gray-900 mt-2 block">
                  {Number(usageSummary.totalRequests || 0).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">Live API invocations</span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-cyan-350 transition-all">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Cached Hits</span>
                <span className="text-3xl font-extrabold text-cyan-600 mt-2 block">
                  {Number(auditLogs.filter((l) => l.status === "cached").length || 0).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">Bypassed model costs</span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-red-350 transition-all">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Failed Calls</span>
                <span className="text-3xl font-extrabold text-red-600 mt-2 block">
                  {Number(auditLogs.filter((l) => l.status === "failed").length || 0).toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">JSON/Network errors</span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-emerald-350 transition-all">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Total AI Cost</span>
                <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">
                  ₹{Number(usageSummary.totalCostInr || (usageSummary.totalCostUsd || 0) * 86.5).toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">Calculated in INR</span>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-violet-350 transition-all">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Est. Cache Savings</span>
                <span className="text-3xl font-extrabold text-violet-600 mt-2 block">
                  ₹{calculateCacheSavings()}
                </span>
                <span className="text-xs text-gray-400 mt-1 block">Free tier optimization</span>
              </div>
            </div>

            {/* Feature Usage Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">AI Costs by Feature</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead>
                      <tr className="text-left text-gray-400 bg-gray-50">
                        <th className="py-2.5 px-4 font-semibold">Feature Name</th>
                        <th className="py-2.5 px-4 font-semibold">Total Requests</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Est. Cost (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {usageByFeature.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-mono text-violet-600">{item._id || "general"}</td>
                          <td className="py-3 px-4">{item.requests}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">
                            ₹{Number(item.costInr || (item.costUsd || 0) * 86.5).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {usageByFeature.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-400">
                            No telemetry logs compiled yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Demand Snapshots */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">AI Market Demand Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead>
                      <tr className="text-left text-gray-400 bg-gray-50">
                        <th className="py-2.5 px-4 font-semibold">Skill</th>
                        <th className="py-2.5 px-4 font-semibold">City</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Unmet Demand</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {demandSnapshots.slice(0, 8).map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-semibold text-gray-900">{item.skill}</td>
                          <td className="py-3 px-4 text-gray-500">{item.city}</td>
                          <td className="py-3 px-4 text-center font-mono text-violet-600">{item.unmetDemandScore}</td>
                          <td className="py-3 px-4 text-right font-mono text-cyan-600">
                            {Number(item.confidence || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {demandSnapshots.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            No market demand snapshots available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Prompt Templates Tab */}
        {activeTab === "prompts" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Templates list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Prompt Templates</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {promptTemplates.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleEditPrompt(item)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all text-left ${
                        editingPrompt?._id === item._id
                          ? "border-violet-500 bg-violet-50/50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-violet-600">
                          {item.feature_name || item.key}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.is_active
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          {item.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {item.prompt_template || item.template}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-3 border-t border-gray-100 pt-2">
                        <span>Model: <span className="text-gray-700 font-mono">{item.model_name || "gemini-1.5-flash"}</span></span>
                        <span>Version: <span className="text-gray-700 font-mono">v{item.version || 1}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor card */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs sticky top-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">
                  {editingPrompt ? "Edit Prompt Template" : "New Prompt Template"}
                </h3>
                <form onSubmit={handleSavePrompt} className="space-y-4 text-left">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Feature Name
                    </label>
                    <select
                      value={promptForm.feature_name}
                      onChange={(e) => setPromptForm((p) => ({ ...p, feature_name: e.target.value }))}
                      disabled={Boolean(editingPrompt)}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                      required
                    >
                      <option value="">Select AI Feature</option>
                      {FEATURES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Active Model
                    </label>
                    <select
                      value={promptForm.model_name}
                      onChange={(e) => setPromptForm((p) => ({ ...p, model_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    >
                      {MODELS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Prompt Template
                    </label>
                    <textarea
                      value={promptForm.prompt_template}
                      onChange={(e) => setPromptForm((p) => ({ ...p, prompt_template: e.target.value }))}
                      placeholder="Prompt text... use {{candidate_data}}, {{job_data}}, etc. as placeholders"
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs font-mono text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                        Temp (0 - 1)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={promptForm.temperature}
                        onChange={(e) => setPromptForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="64"
                        value={promptForm.maxTokens}
                        onChange={(e) => setPromptForm((p) => ({ ...p, maxTokens: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status Enable Toggle
                    </span>
                    <button
                      type="button"
                      onClick={() => setPromptForm((p) => ({ ...p, is_active: !p.is_active }))}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        promptForm.is_active ? "bg-violet-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`block w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-transform duration-200 ${
                          promptForm.is_active ? "translate-x-5.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-all"
                    >
                      Save Changes
                    </button>
                    {editingPrompt && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI Pipeline Audits Tab */}
        {activeTab === "audits" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filter Bar */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    AI Feature
                  </span>
                  <select
                    value={auditFeature}
                    onChange={(e) => setAuditFeature(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Features</option>
                    {FEATURES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Status
                  </span>
                  <select
                    value={auditStatus}
                    onChange={(e) => setAuditStatus(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="repaired">Repaired</option>
                    <option value="cached">Cached</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Audited <span className="font-semibold text-gray-900">{auditTotal}</span> pipeline executions
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-gray-400 bg-gray-50 border-b border-gray-100">
                      <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-3.5 px-4 font-semibold">Executing User</th>
                      <th className="py-3.5 px-4 font-semibold">Feature Name</th>
                      <th className="py-3.5 px-4 font-semibold">Model Name</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Confidence</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {auditLogs.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition-all">
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-400">
                          {new Date(item.created_at || item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.user_id ? (
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-gray-900 text-xs">
                                {item.user_id.name || "User"}
                              </span>
                              <span className="text-[10px] text-gray-400">{item.user_id.email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">System</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 text-xs font-mono bg-violet-50 border border-violet-100 text-violet-600 rounded">
                            {item.feature_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">
                          {item.model_name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono text-xs font-semibold text-gray-950">
                              {item.confidence_score}%
                            </span>
                            {item.needs_review && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-red-50 text-red-600 border border-red-200 mt-1 uppercase tracking-wider">
                                <HiExclamationCircle className="h-2 w-2" />
                                Needs Review
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              item.status === "success"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : item.status === "repaired"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : item.status === "cached"
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedAudit(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all border border-gray-200"
                            >
                              <HiEye className="h-3.5 w-3.5" />
                              Inspect
                            </button>
                            <button
                              onClick={() => handleRerun(item)}
                              disabled={rerunningIds.has(item._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium rounded-lg border border-violet-200 disabled:opacity-50 transition-all"
                            >
                              <HiRefresh className="h-3.5 w-3.5" />
                              {rerunningIds.has(item._id) ? "Running..." : "Re-run"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          No AI executions matched filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {auditPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 py-4 px-6 text-xs text-gray-500">
                  <span>
                    Page <span className="font-semibold text-gray-900">{auditPage}</span> of{" "}
                    <span className="font-semibold text-gray-900">{auditPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchAuditLogs(auditPage - 1)}
                      disabled={auditPage <= 1}
                      className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => fetchAuditLogs(auditPage + 1)}
                      disabled={auditPage >= auditPages}
                      className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-5xl w-full p-6 shadow-2xl relative text-left my-8">
            <button
              onClick={() => setSelectedAudit(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
            >
              <HiXCircle className="w-6 h-6" />
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Audit Inspection Pane
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                    selectedAudit.status === "success"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {selectedAudit.status}
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">{selectedAudit._id}</p>
            </div>

            {/* Summary Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6 text-xs text-gray-500">
              <div>
                <span className="block text-gray-400 uppercase tracking-wider font-semibold">Timestamp</span>
                <span className="text-gray-800 mt-1 inline-block">
                  {new Date(selectedAudit.created_at || selectedAudit.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-gray-400 uppercase tracking-wider font-semibold">Feature</span>
                <span className="text-violet-600 font-mono mt-1 inline-block">
                  {selectedAudit.feature_name}
                </span>
              </div>
              <div>
                <span className="block text-gray-400 uppercase tracking-wider font-semibold">Model / Provider</span>
                <span className="text-gray-800 mt-1 inline-block">
                  {selectedAudit.model_name}
                </span>
              </div>
              <div>
                <span className="block text-gray-400 uppercase tracking-wider font-semibold">Confidence Score</span>
                <span className="text-cyan-600 font-bold mt-1 inline-block">
                  {selectedAudit.confidence_score}% {selectedAudit.needs_review ? "(Needs Review)" : ""}
                </span>
              </div>
            </div>

            {/* Error Message if failed */}
            {selectedAudit.error_message && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Error Details</span>
                <pre className="text-xs font-mono text-red-600 mt-2 whitespace-pre-wrap">
                  {selectedAudit.error_message}
                </pre>
              </div>
            )}

            {/* Payload Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Raw AI Model Response (Audit Only)
                </span>
                <pre className="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-xl font-mono text-[11px] h-96 overflow-y-auto whitespace-pre-wrap">
                  {selectedAudit.raw_response || "No raw response recorded"}
                </pre>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Parsed JSON Schema (Dashboard Rendered)
                </span>
                <pre className="bg-gray-50 border border-gray-200 text-violet-800 p-4 rounded-xl font-mono text-[11px] h-96 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedAudit.parsed_json || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-all border border-gray-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIControlCenter;
