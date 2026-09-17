import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import partnerApi from "../../services/partnerApi";

const PartnerPayouts = () => {
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    partnerApi
      .getPayouts()
      .then((res) => setPayouts(res.data.payouts || []))
      .catch((err) => toast.error(err?.response?.data?.message || "Failed to load payouts"));
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-[#EAE7F2] shadow-sm overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-extrabold">Payout Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Track your commission withdrawals.</p>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-[#F8F7FB] text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left p-4">Amount</th>
            <th className="text-left p-4">Method</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Requested</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((item) => (
            <tr key={item._id} className="border-t">
              <td className="p-4 font-bold">₹{item.amount}</td>
              <td className="p-4">{item.paymentMethod || "N/A"}</td>
              <td className="p-4 capitalize">{item.status}</td>
              <td className="p-4">{new Date(item.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}

          {payouts.length === 0 && (
            <tr>
              <td colSpan="4" className="p-8 text-center text-gray-500">
                No payout requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PartnerPayouts;