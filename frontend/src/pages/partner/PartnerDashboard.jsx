import { useEffect, useState } from "react";
import {
    Copy,
    Crown,
    IndianRupee,
    Users,
    UserCheck,
    Clock,
    RefreshCcw,
    Wallet,
    Phone,
    MessageCircle,
    MoreHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import partnerApi from "../../services/partnerApi";
import { Link } from "react-router-dom";

const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;

const StatCard = ({ icon: Icon, label, value, growth }) => (
    <div className="bg-white rounded-3xl border border-[#EAE7F2] shadow-sm p-5">
        <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center">
                <Icon size={18} />
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                ↗ {growth || "+0%"}
            </span>
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mt-4">{value}</h3>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
);

const PartnerDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [showWithdraw, setShowWithdraw] = useState(false);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const res = await partnerApi.getDashboard();
            setData(res.data.data);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const copyReferral = async () => {
        await navigator.clipboard.writeText(data?.partner?.referralLink || "");
        toast.success("Referral link copied");
    };

    const submitWithdraw = async () => {
        try {
            await partnerApi.requestPayout({
                amount: Number(withdrawAmount),
                paymentMethod: "bank",
            });
            toast.success("Withdrawal request submitted");
            setShowWithdraw(false);
            setWithdrawAmount("");
            loadDashboard();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Request failed");
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading partner dashboard...</div>;
    }

    const partner = data?.partner || {};
    const stats = data?.stats || {};
    const tier = data?.tier || {};
    const referrals = data?.referrals || [];

    return (
        <div className="space-y-5 sm:space-y-6">
            <section className="rounded-[32px] bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#A855F7] text-white p-5 sm:p-8 shadow-[0_24px_60px_rgba(124,58,237,0.28)] relative overflow-hidden">
                <div className="absolute -top-24 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div>
                        <p className="text-xs tracking-[0.25em] text-purple-100 uppercase">
                            Total Revenue Collected
                        </p>
                        <h2 className="text-4xl font-extrabold mt-3">
                            {money(stats.totalRevenueCollected)}
                        </h2>
                        <span className="inline-block mt-2 text-xs bg-white/15 px-3 py-1 rounded-full">
                            ↗ Partner referral revenue
                        </span>

                        <p className="text-xs tracking-[0.25em] text-purple-100 uppercase mt-8">
                            Total Commission Earned
                        </p>
                        <h2 className="text-4xl font-extrabold mt-3">
                            {money(stats.totalCommissionEarned)}
                        </h2>
                        <span className="inline-block mt-2 text-xs bg-white/15 px-3 py-1 rounded-full">
                            {partner.commissionRate || 40}% commission
                        </span>
                    </div>

                    <div className="flex flex-col justify-center items-start md:items-end">
                        <button
                            onClick={() => setShowWithdraw(true)}
                            className="bg-white text-[#7C3AED] px-6 py-3 rounded-2xl font-bold shadow-md hover:shadow-lg"
                        >
                            Withdraw Commission
                        </button>
                        <p className="text-sm text-purple-100 mt-4">
                            Available: {money(stats.availableCommission)}
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard icon={Users} label="Total Referrals" value={stats.totalReferrals || 0} growth="+8.2%" />
                <StatCard icon={UserCheck} label="Active Referrals" value={stats.activeReferrals || 0} growth="+4.1%" />
                <StatCard icon={Clock} label="Referral Candidates" value={stats.referralCandidates || 0} growth="+12.4%" />
                <StatCard icon={RefreshCcw} label="Inactive Referrals" value={stats.inactiveReferrals || 0} growth="+2.6%" />
                <StatCard icon={IndianRupee} label="Partner Revenue" value={money(stats.totalRevenueCollected)} growth="+15.8%" />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 bg-white rounded-3xl border border-[#EAE7F2] p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">Your Referral Link</h3>
                            <p className="text-sm text-gray-500 mt-1">Share it to start earning instantly.</p>
                        </div>
                        <span className="text-xs bg-purple-50 text-[#7C3AED] px-3 py-1 rounded-full font-semibold">
                            Lifetime: {stats.totalReferrals || 0} referrals
                        </span>
                    </div>

                    <div className="mt-5 flex gap-3 bg-[#F8F7FB] rounded-2xl p-3">
                        <input
                            value={partner.referralLink || ""}
                            readOnly
                            className="flex-1 bg-transparent outline-none text-sm text-gray-700"
                        />
                        <button
                            onClick={copyReferral}
                            className="flex items-center gap-2 bg-[#7C3AED] text-white px-4 py-2 rounded-xl text-sm font-semibold"
                        >
                            <Copy size={15} />
                            Copy
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#EAE7F2] p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Crown size={22} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900">{tier.name || "Gold"} Partner</h3>
                            <p className="text-xs text-gray-500">Level {tier.level || 1}</p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Progress to Platinum</span>
                            <span>{tier.progress || 0}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#7C3AED] rounded-full"
                                style={{ width: `${tier.progress || 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-[#F8F7FB] rounded-2xl p-3">
                            <p className="font-bold text-sm">#{tier.rank || "Gold"}</p>
                            <p className="text-[11px] text-gray-500">Rank</p>
                        </div>
                        <div className="bg-[#F8F7FB] rounded-2xl p-3">
                            <p className="font-bold text-sm">{tier.streak || 0} wks</p>
                            <p className="text-[11px] text-gray-500">Streak</p>
                        </div>
                        <div className="bg-[#F8F7FB] rounded-2xl p-3">
                            <p className="font-bold text-sm">{tier.bonus || 0}x</p>
                            <p className="text-[11px] text-gray-500">Bonus</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-3xl border border-[#EAE7F2] shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h3 className="font-extrabold text-gray-900">Candidates Registered By You</h3>
                        <p className="text-sm text-gray-500">{referrals.length} candidates listed</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/partner/create-provider"
                            className="px-4 py-2 rounded-xl border text-sm font-semibold"
                        >
                            Create Provider Profile
                        </Link>

                        <Link
                            to="/partner/create-recruiter"
                            className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold"
                        >
                            Create Recruiter Profile
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F8F7FB] text-xs uppercase text-gray-500">
                            <tr>
                                <th className="text-left p-4">Candidate</th>
                                <th className="text-left p-4">Contact</th>
                                <th className="text-left p-4">Role</th>
                                <th className="text-left p-4">Plan</th>
                                <th className="text-left p-4">Registered</th>
                                <th className="text-left p-4">Activity</th>
                                <th className="text-left p-4">Reward Status</th>
                                <th className="text-left p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referrals.map((item) => (
                                <tr key={item._id} className="border-t border-[#EAE7F2]">
                                    <td className="p-4 font-semibold text-gray-900">
                                        {item.referredUserId?.name || "N/A"}
                                    </td>
                                    <td className="p-4 text-gray-500">
                                        {item.referredUserId?.phone || item.referredUserId?.email || "N/A"}
                                    </td>
                                    <td className="p-4 capitalize">{item.referredRole}</td>
                                    <td className="p-4">{item.selectedPlanId?.name || "Not selected"}</td>
                                    <td className="p-4 text-gray-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        {item.referredRole === 'recruiter' ? (
                                            <span className="text-xs">{item.jobsCreated || 0} Jobs Posted</span>
                                        ) : (
                                            <span className="text-xs">{item.jobsCompleted || 0} Jobs Done</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {item.rewardEligible ? (
                                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Eligible</span>
                                        ) : (
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Pending</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <button className="p-2 text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-lg">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {referrals.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No referrals found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {showWithdraw && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold">Withdraw Commission</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Available: {money(stats.availableCommission)}
                        </p>
                        <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full mt-5 px-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-purple-200"
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowWithdraw(false)}
                                className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitWithdraw}
                                className="flex-1 px-4 py-3 rounded-2xl bg-[#7C3AED] text-white font-semibold"
                            >
                                Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerDashboard;