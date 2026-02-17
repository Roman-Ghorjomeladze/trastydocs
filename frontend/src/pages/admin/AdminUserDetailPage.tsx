import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, DollarSign } from 'lucide-react';
import { useAdminStore } from '../../stores/admin.store.ts';
import { ROUTES } from '../../lib/constants.ts';
import { cn } from '../../lib/utils.ts';

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const {
    selectedUser: user,
    selectedUserLoading: loading,
    plans,
    creditHistory,
    creditHistoryLoading,
    fetchUser,
    fetchPlans,
    fetchCreditHistory,
    updateUser,
    toggleAdmin,
    assignPlan,
    grantCredits,
    clearSelectedUser,
  } = useAdminStore();

  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
      fetchPlans();
      fetchCreditHistory(userId);
    }
    return () => clearSelectedUser();
  }, [userId, fetchUser, fetchPlans, fetchCreditHistory, clearSelectedUser]);

  useEffect(() => {
    if (user?.subscription?.planId) {
      setSelectedPlanId(user.subscription.planId);
    }
  }, [user?.subscription?.planId]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleToggleActive = async () => {
    await updateUser(user.id, { isActive: !user.isActive });
  };

  const handleToggleAdmin = async () => {
    await toggleAdmin(user.id, !user.isAdmin);
  };

  const handleAssignPlan = async () => {
    if (selectedPlanId && selectedPlanId !== user.subscription?.planId) {
      await assignPlan(user.id, selectedPlanId);
    }
  };

  const handleGrantCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount === 0) return;
    await grantCredits(user.id, amount, creditReason || undefined);
    setCreditAmount('');
    setCreditReason('');
  };

  return (
    <div>
      {/* Back link */}
      <Link
        to={ROUTES.ADMIN_USERS}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </Link>

      {/* User Header */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAdmin}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                user.isAdmin
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-muted text-foreground hover:bg-border',
              )}
            >
              {user.isAdmin ? (
                <>
                  <Shield className="w-4 h-4" /> Admin
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4" /> Make Admin
                </>
              )}
            </button>
            <button
              onClick={handleToggleActive}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                user.isActive
                  ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
              )}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Management */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Subscription</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold text-foreground">
                {user.subscription?.planName ?? 'No Plan'}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Change Plan
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                >
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} (${p.price}/mo)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignPlan}
                  disabled={!selectedPlanId || selectedPlanId === user.subscription?.planId}
                  className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Usage */}
            {user.usage && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Usage</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Companies', value: user.usage.companies },
                    { label: 'Contractors', value: user.usage.contractors },
                    { label: 'Documents', value: user.usage.documents },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-2 rounded-lg bg-muted">
                      <p className="text-lg font-bold text-foreground">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credits Management */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Credits</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <DollarSign className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  {user.creditBalance?.toFixed(2) ?? '0.00'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Grant Credits
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-24 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                />
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                />
                <button
                  onClick={handleGrantCredits}
                  disabled={!creditAmount || parseFloat(creditAmount) === 0}
                  className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
                >
                  Grant
                </button>
              </div>
            </div>

            {/* Credit History */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">History</p>
              {creditHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : creditHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credit transactions</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {creditHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm"
                    >
                      <div>
                        <span
                          className={cn(
                            'font-medium',
                            tx.amount > 0 ? 'text-green-600' : 'text-red-600',
                          )}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          {tx.amount}
                        </span>
                        {tx.reason && (
                          <span className="text-muted-foreground ml-2">
                            {tx.reason}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
