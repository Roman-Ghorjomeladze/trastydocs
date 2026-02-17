import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAdminStore } from '../../stores/admin.store.ts';
import type { PlanLimits } from '../../types/index.ts';
import { cn } from '../../lib/utils.ts';

const EMPTY_LIMITS: PlanLimits = {
  maxCompanies: 3,
  maxContractors: 10,
  maxDocuments: 50,
  maxSignaturesPerCompany: 1,
  maxStampsPerCompany: 1,
};

interface PlanForm {
  name: string;
  displayName: string;
  price: string;
  paddlePriceId: string;
  limits: PlanLimits;
  sortOrder: string;
}

export function AdminPlansPage() {
  const { plans, plansLoading, fetchPlans, createPlan, updatePlan, deletePlan } =
    useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PlanForm>({
    name: '',
    displayName: '',
    price: '0',
    paddlePriceId: '',
    limits: { ...EMPTY_LIMITS },
    sortOrder: '0',
  });

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const resetForm = () => {
    setForm({
      name: '',
      displayName: '',
      price: '0',
      paddlePriceId: '',
      limits: { ...EMPTY_LIMITS },
      sortOrder: '0',
    });
    setEditingId(null);
    setShowCreate(false);
  };

  const startEdit = (plan: (typeof plans)[number]) => {
    setEditingId(plan.id);
    setShowCreate(false);
    setForm({
      name: plan.name,
      displayName: plan.displayName,
      price: String(plan.price),
      paddlePriceId: plan.paddlePriceId || '',
      limits: { ...plan.limits },
      sortOrder: String(plan.sortOrder),
    });
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      displayName: form.displayName,
      price: parseFloat(form.price) || 0,
      paddlePriceId: form.paddlePriceId.trim() || null,
      limits: form.limits,
      sortOrder: parseInt(form.sortOrder) || 0,
    };

    if (editingId) {
      await updatePlan(editingId, data);
    } else {
      await createPlan(data);
    }
    resetForm();
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Delete this plan? Users on this plan will need to be reassigned.')) {
      await deletePlan(planId);
    }
  };

  const updateLimit = (key: keyof PlanLimits, value: string) => {
    setForm((f) => ({
      ...f,
      limits: {
        ...f.limits,
        [key]: parseInt(value) || 0,
      },
    }));
  };

  const formatLimit = (v: number) => (v === -1 ? 'Unlimited' : String(v));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setForm({
              name: '',
              displayName: '',
              price: '0',
              paddlePriceId: '',
              limits: { ...EMPTY_LIMITS },
              sortOrder: String(plans.length),
            });
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Plan' : 'Create Plan'}
            </h2>
            <button onClick={resetForm} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Internal Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={!!editingId}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm disabled:opacity-50"
                placeholder="e.g. starter"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                placeholder="e.g. Starter"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Price ($/mo)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground block mb-1">
              Paddle Price ID <span className="text-xs">(from Paddle Dashboard, e.g. pri_01abc...)</span>
            </label>
            <input
              type="text"
              value={form.paddlePriceId}
              onChange={(e) => setForm((f) => ({ ...f, paddlePriceId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              placeholder="pri_..."
            />
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Limits <span className="text-xs">(use -1 for unlimited)</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {(
              [
                ['maxCompanies', 'Companies'],
                ['maxContractors', 'Contractors'],
                ['maxDocuments', 'Documents'],
                ['maxSignaturesPerCompany', 'Sigs/Company'],
                ['maxStampsPerCompany', 'Stamps/Company'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground block mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  value={form.limits[key]}
                  onChange={(e) => updateLimit(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            {editingId ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      )}

      {/* Plans List */}
      {plansLoading && plans.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'bg-card border rounded-xl p-5',
                  plan.isActive ? 'border-border' : 'border-border opacity-60',
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {plan.displayName}
                    </h3>
                    <p className="text-xs text-muted-foreground">{plan.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(plan)}
                      className="p-1.5 rounded hover:bg-muted"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1.5 rounded hover:bg-muted"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>

                <p className="text-2xl font-bold text-foreground mb-3">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>

                <div className="space-y-1.5 text-sm">
                  {[
                    ['Companies', plan.limits.maxCompanies],
                    ['Contractors', plan.limits.maxContractors],
                    ['Documents', plan.limits.maxDocuments],
                    ['Sigs/Co', plan.limits.maxSignaturesPerCompany],
                    ['Stamps/Co', plan.limits.maxStampsPerCompany],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span>{label}</span>
                      <span className="font-medium text-foreground">
                        {formatLimit(value as number)}
                      </span>
                    </div>
                  ))}
                </div>

                {plan.paddlePriceId && (
                  <p className="text-xs text-muted-foreground mt-2 truncate" title={plan.paddlePriceId}>
                    Paddle: {plan.paddlePriceId}
                  </p>
                )}

                {!plan.isActive && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Inactive</p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
