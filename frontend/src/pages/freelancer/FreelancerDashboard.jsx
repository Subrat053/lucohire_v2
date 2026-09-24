import FreelancerLayout from "../../layouts/FreelancerLayout";
import FreelancerDashboardPage from "./FreelancerDashboardPage";

/**
 * Backward compatibility wrapper for FreelancerDashboard
 * When rendered directly, wraps with FreelancerLayout and FreelancerDashboardPage.
 */
export default function FreelancerDashboard() {
  return (
    <FreelancerLayout>
      <FreelancerDashboardPage />
    </FreelancerLayout>
  );
}
