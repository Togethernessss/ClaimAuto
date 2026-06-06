// src/pages/Admin/Rules/Rules.jsx
import { useState, useEffect, useCallback } from 'react';
import { Container } from 'react-bootstrap';
import {
  getAllRules, createRule, updateRule,
  activateRule, deactivateRule, deleteRule,
} from '../../../services/rules/ruleService';

import RulesHeader   from './components/RulesHeader';
import RulesFilters  from './components/RulesFilters';
import RulesTable    from './components/RulesTable';
import RuleFormModal from './components/RuleFormModal';
import {
  ActivateRuleModal,
  DeactivateRuleModal,
  DeleteRuleModal,
} from './components/RuleActionModals';

const EMPTY_FORM = {
  name: '', description: '', ruleType: '',
  conditionExpressionJSON: '', actionExpressionJSON: '', priority: '',
};

const TABS = [
  { key: 'Active',   label: 'Active Rules',   icon: 'bi-check-circle-fill', badgeBg: '#d1f2eb', badgeColor: '#085041' },
  { key: 'Draft',    label: 'Draft Rules',    icon: 'bi-pencil-fill',       badgeBg: '#fff3e0', badgeColor: '#e65100' },
  { key: 'Inactive', label: 'Inactive Rules', icon: 'bi-pause-circle-fill', badgeBg: '#f5f5f5', badgeColor: '#757575' },
];

export default function Rules() {

  const [activeTab, setActiveTab] = useState('Active');

  const [rules,      setRules]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const [showForm,    setShowForm]    = useState(false);
  const [formMode,    setFormMode]    = useState('create');
  const [formTarget,  setFormTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,   setFormError]   = useState(null);

  const [showActivate,    setShowActivate]    = useState(false);
  const [activateTarget,  setActivateTarget]  = useState(null);
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateError,   setActivateError]   = useState(null);

  const [showDeactivate,    setShowDeactivate]    = useState(false);
  const [deactivateTarget,  setDeactivateTarget]  = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError,   setDeactivateError]   = useState(null);

  const [showDelete,    setShowDelete]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllRules();
      setRules(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load rules.';
      setError(typeof msg === 'string' ? msg : 'Failed to load rules.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // Counts per tab (unfiltered — for badges)
  const countByTab = {
    Active:   rules.filter(r => r.status === 'Active').length,
    Draft:    rules.filter(r => r.status === 'Draft').length,
    Inactive: rules.filter(r => r.status === 'Inactive').length,
  };

  // Current tab rules with search + type filter
  const currentRules = rules
    .filter(r => r.status === activeTab)
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch =
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q);
      const matchType = typeFilter === 'All' || r.ruleType === typeFilter;
      return matchSearch && matchType;
    });

  const hasFilters = !!search || typeFilter !== 'All';

  // Functional setState — critical when multiple fields are updated in a single
  // synchronous block (e.g. handleTemplateSelect in RuleFormModal sets 5+ fields
  // back-to-back). With the closure form, each call would overwrite the previous
  // because they all spread the same stale `form` snapshot.
  const handleFormField = (field) => (e) => {
    const { value } = e.target;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Create
  const openCreate = () => {
    setFormMode('create'); setFormTarget(null);
    setForm(EMPTY_FORM); setFormError(null); setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      await createRule({
        name: form.name, description: form.description || null,
        ruleType: form.ruleType,
        conditionExpressionJSON: form.conditionExpressionJSON,
        actionExpressionJSON: form.actionExpressionJSON,
        priority: Number(form.priority),
      });
      setShowForm(false);
      await loadRules();
      setActiveTab('Draft');
      setSuccessMsg(`Rule "${form.name}" created in Draft. Activate it to use in adjudication.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to create rule.';
      setFormError(typeof msg === 'string' ? msg : 'Failed to create rule.');
    } finally { setFormLoading(false); }
  };

  // Edit
  const openEdit = (rule) => {
    setFormMode('edit'); setFormTarget(rule);
    setForm({
      name: rule.name, description: rule.description ?? '',
      ruleType: rule.ruleType,
      conditionExpressionJSON: rule.conditionExpressionJSON,
      actionExpressionJSON: rule.actionExpressionJSON,
      priority: String(rule.priority),
    });
    setFormError(null); setShowForm(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true); setFormError(null);
    try {
      await updateRule(formTarget.ruleID, {
        name: form.name, description: form.description || null,
        conditionExpressionJSON: form.conditionExpressionJSON,
        actionExpressionJSON: form.actionExpressionJSON,
        priority: Number(form.priority),
      });
      setShowForm(false);
      await loadRules();
      setSuccessMsg(`Rule "${form.name}" updated (version bumped).`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to update rule.';
      setFormError(typeof msg === 'string' ? msg : 'Failed to update rule.');
    } finally { setFormLoading(false); }
  };

  // Activate
  const openActivate   = (rule) => { setActivateTarget(rule); setActivateError(null); setShowActivate(true); };
  const handleActivate = async () => {
    setActivateLoading(true);
    try {
      await activateRule(activateTarget.ruleID);
      setShowActivate(false); await loadRules();
      setActiveTab('Active');
      setSuccessMsg(`Rule "${activateTarget.name}" is now Active.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to activate.';
      setActivateError(typeof msg === 'string' ? msg : 'Failed to activate.');
    } finally { setActivateLoading(false); }
  };

  // Deactivate
  const openDeactivate   = (rule) => { setDeactivateTarget(rule); setDeactivateError(null); setShowDeactivate(true); };
  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await deactivateRule(deactivateTarget.ruleID);
      setShowDeactivate(false); await loadRules();
      setActiveTab('Inactive');
      setSuccessMsg(`Rule "${deactivateTarget.name}" deactivated.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to deactivate.';
      setDeactivateError(typeof msg === 'string' ? msg : 'Failed to deactivate.');
    } finally { setDeactivateLoading(false); }
  };

  // Delete
  const openDelete   = (rule) => { setDeleteTarget(rule); setDeleteError(null); setShowDelete(true); };
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteRule(deleteTarget.ruleID);
      setShowDelete(false); await loadRules();
      setSuccessMsg(`Rule "${deleteTarget.name}" permanently deleted.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to delete.';
      setDeleteError(typeof msg === 'string' ? msg : 'Failed to delete.');
    } finally { setDeleteLoading(false); }
  };

  return (
    <Container fluid>

      {/* Header — same pattern as PoliciesHeader */}
      <RulesHeader successMsg={successMsg} onCreateClick={openCreate} />

      {/* ── TAB BAR — same underline style as Adjudication ────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1.5px solid #dee2e6',
        marginBottom: 20,
        gap: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count    = countByTab[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              style={{
                padding: '8px 20px',
                border: 'none',
                borderBottom: isActive ? '2.5px solid #667eea' : '2.5px solid transparent',
                marginBottom: -1.5,
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                color: isActive ? '#667eea' : '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={tab.icon} style={{ fontSize: 12 }}></i>
              {tab.label}
              <span style={{
                background: isActive ? '#667eea' : tab.badgeBg,
                color: isActive ? 'white' : tab.badgeColor,
                borderRadius: 20,
                padding: '1px 8px',
                fontSize: 11,
                fontWeight: 600,
                minWidth: 22,
                textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters — search + type only (status handled by tabs) */}
      <RulesFilters
        search={search}
        typeFilter={typeFilter}
        filteredCount={currentRules.length}
        totalCount={countByTab[activeTab]}
        loading={loading}
        onSearchChange={setSearch}
        onTypeChange={setTypeFilter}
      />

      {/* Table */}
      <RulesTable
        rules={currentRules}
        loading={loading}
        error={error}
        hasFilters={hasFilters}
        onRetry={loadRules}
        onEdit={openEdit}
        onActivate={openActivate}
        onDeactivate={openDeactivate}
        onDelete={openDelete}
        onCreateFirst={openCreate}
      />

      {/* Modals */}
      <RuleFormModal
        show={showForm} loading={formLoading} error={formError}
        form={form} mode={formMode} rule={formTarget}
        onHide={() => setShowForm(false)}
        onFieldChange={handleFormField}
        onSubmit={formMode === 'create' ? handleCreate : handleEdit}
      />
      <ActivateRuleModal
        show={showActivate} loading={activateLoading} error={activateError}
        rule={activateTarget} onHide={() => setShowActivate(false)} onConfirm={handleActivate}
      />
      <DeactivateRuleModal
        show={showDeactivate} loading={deactivateLoading} error={deactivateError}
        rule={deactivateTarget} onHide={() => setShowDeactivate(false)} onConfirm={handleDeactivate}
      />
      <DeleteRuleModal
        show={showDelete} loading={deleteLoading} error={deleteError}
        rule={deleteTarget} onHide={() => setShowDelete(false)} onConfirm={handleDelete}
      />

    </Container>
  );
}
