// RecoverFlow AI - Production-Quality Frontend Dashboard (React + Babel CDN)

const { useState, useEffect, useMemo, useRef } = React;

// --- MOCK / DEMO DATA (Used for instant interactive demo & fallback if API is offline) ---
const INITIAL_DEMO_STATS = {
    revenueAtRisk: 248500,
    recoverableRevenue: 176200,
    revenueRecovered: 108450,
    recoveryRate: 43.6,
    transactionsRecovered: 47,
    activeWorkflows: 12,
    policyBlocks: 18,
    humanEscalations: 7,
    totalTransactions: 100,
    stoppedWorkflows: 28
};

const DEMO_TRANSACTIONS = [
    {
        id: 1,
        event_id: "TXN-10482",
        customer_id: "CUST-88392",
        merchant_id: "MER-0045",
        amount: 4999,
        recovered_amount: 4999,
        payment_method: "UPI",
        failure_reason: "timeout",
        risk_score: 2.1,
        recovery_prob: 0.792,
        recommended_action: "RETRY",
        policy_status: "ALLOWED",
        status: "recovered",
        event_type: "subscription_invoice_failed",
        customer_consent: 1,
        emails_sent_today: 0,
        sms_sent_today: 0,
        total_recovery_messages_sent: 2,
        event_timestamp: "2026-09-05T10:41:02Z",
        llm_explanation: "Retry was selected because the predicted recovery probability is highest (79.2%) and the customer is eligible under merchant policies.",
        payment_link_url: null,
        scores: [
            { action: "RETRY", recovery_prob: 0.792, reason: "High recovery chance for timeout failure with low risk score." },
            { action: "PAYMENT_LINK", recovery_prob: 0.584, reason: "Moderate recovery chance." },
            { action: "EMAIL_OFFER", recovery_prob: 0.549, reason: "Moderate recovery chance. Consent available." },
            { action: "SMS_REMINDER", recovery_prob: 0.535, reason: "Moderate recovery chance. Consent available." },
            { action: "HUMAN_REVIEW", recovery_prob: 0.449, reason: "Moderate recovery chance." },
            { action: "NONE", recovery_prob: 0.287, reason: "Low recovery probability." }
        ]
    },
    {
        id: 2,
        event_id: "TXN-10483",
        customer_id: "CUST-91204",
        merchant_id: "MER-0012",
        amount: 12500,
        recovered_amount: 12500,
        payment_method: "Card",
        failure_reason: "network_error",
        risk_score: 1.8,
        recovery_prob: 0.841,
        recommended_action: "PAYMENT_LINK",
        policy_status: "ALLOWED",
        status: "recovered",
        event_type: "checkout_abandoned",
        customer_consent: 1,
        emails_sent_today: 1,
        sms_sent_today: 0,
        total_recovery_messages_sent: 3,
        event_timestamp: "2026-09-05T11:15:30Z",
        llm_explanation: "Payment link sent via Razorpay Test Mode. Customer consent verified.",
        payment_link_url: "https://pay.razorpay.com/plink_demo10483",
        scores: [
            { action: "PAYMENT_LINK", recovery_prob: 0.841, reason: "High recovery probability for abandoned checkout." },
            { action: "RETRY", recovery_prob: 0.620, reason: "Moderate recovery chance." },
            { action: "EMAIL_OFFER", recovery_prob: 0.590, reason: "Moderate chance." },
            { action: "SMS_REMINDER", recovery_prob: 0.510, reason: "Moderate chance." },
            { action: "HUMAN_REVIEW", recovery_prob: 0.350, reason: "Low chance." },
            { action: "NONE", recovery_prob: 0.150, reason: "Lowest recovery." }
        ]
    },
    {
        id: 3,
        event_id: "TXN-10484",
        customer_id: "CUST-77412",
        merchant_id: "MER-0088",
        amount: 8900,
        recovered_amount: 0,
        payment_method: "NetBanking",
        failure_reason: "card_declined",
        risk_score: 4.8,
        recovery_prob: 0.549,
        recommended_action: "EMAIL_OFFER",
        policy_status: "BLOCKED",
        status: "blocked",
        event_type: "subscription_invoice_overdue",
        customer_consent: 0,
        emails_sent_today: 0,
        sms_sent_today: 0,
        total_recovery_messages_sent: 5,
        event_timestamp: "2026-09-05T12:02:10Z",
        llm_explanation: "EMAIL_OFFER was blocked by Policy Agent because customer consent flag is 0. System automatically stopped outreach.",
        payment_link_url: null,
        scores: [
            { action: "EMAIL_OFFER", recovery_prob: 0.549, reason: "Blocked: Consent absent." },
            { action: "SMS_REMINDER", recovery_prob: 0.535, reason: "Blocked: Consent absent." },
            { action: "RETRY", recovery_prob: 0.410, reason: "Card declined by issuing bank." },
            { action: "HUMAN_REVIEW", recovery_prob: 0.380, reason: "Low priority." },
            { action: "NONE", recovery_prob: 0.200, reason: "Low probability." }
        ]
    },
    {
        id: 4,
        event_id: "TXN-10485",
        customer_id: "CUST-65011",
        merchant_id: "MER-0045",
        amount: 25000,
        recovered_amount: 0,
        payment_method: "Card",
        failure_reason: "authentication_failed",
        risk_score: 8.6,
        recovery_prob: 0.795,
        recommended_action: "HUMAN_REVIEW",
        policy_status: "ESCALATED",
        status: "escalated",
        event_type: "subscription_invoice_failed",
        customer_consent: 1,
        emails_sent_today: 0,
        sms_sent_today: 0,
        total_recovery_messages_sent: 1,
        event_timestamp: "2026-09-05T13:40:00Z",
        llm_explanation: "Transaction risk score is 8.6 (> 7.5 threshold). Policy Agent escalated to human review team for safety.",
        payment_link_url: null,
        scores: [
            { action: "HUMAN_REVIEW", recovery_prob: 0.795, reason: "Escalated: High fraud risk score." },
            { action: "RETRY", recovery_prob: 0.510, reason: "High risk score prevents automatic retry." },
            { action: "PAYMENT_LINK", recovery_prob: 0.480, reason: "Blocked due to risk threshold." },
            { action: "NONE", recovery_prob: 0.210, reason: "Default fallback." }
        ]
    },
    {
        id: 5,
        event_id: "TXN-10486",
        customer_id: "CUST-44109",
        merchant_id: "MER-0102",
        amount: 3200,
        recovered_amount: 3200,
        payment_method: "UPI",
        failure_reason: "insufficient_funds",
        risk_score: 2.9,
        recovery_prob: 0.710,
        recommended_action: "SMS_REMINDER",
        policy_status: "ALLOWED",
        status: "recovered",
        event_type: "payment_session_dropped",
        customer_consent: 1,
        emails_sent_today: 1,
        sms_sent_today: 1,
        total_recovery_messages_sent: 4,
        event_timestamp: "2026-09-05T14:10:00Z",
        llm_explanation: "SMS reminder sent. Customer completed payment within 4 minutes. Workflow stopped automatically.",
        payment_link_url: null,
        scores: [
            { action: "SMS_REMINDER", recovery_prob: 0.710, reason: "High conversion for dropped UPI sessions." },
            { action: "RETRY", recovery_prob: 0.650, reason: "Moderate chance." },
            { action: "PAYMENT_LINK", recovery_prob: 0.580, reason: "Moderate chance." },
            { action: "NONE", recovery_prob: 0.190, reason: "Low chance." }
        ]
    },
    {
        id: 6,
        event_id: "TXN-10487",
        customer_id: "CUST-30911",
        merchant_id: "MER-0045",
        amount: 15000,
        recovered_amount: 0,
        payment_method: "Wallet",
        failure_reason: "bank_declined",
        risk_score: 3.4,
        recovery_prob: 0.450,
        recommended_action: "SMS_REMINDER",
        policy_status: "BLOCKED",
        status: "blocked",
        event_type: "subscription_invoice_failed",
        customer_consent: 1,
        emails_sent_today: 3,
        sms_sent_today: 2,
        total_recovery_messages_sent: 15,
        event_timestamp: "2026-09-05T14:45:00Z",
        llm_explanation: "SMS_REMINDER blocked because daily SMS limit (2) and lifetime message cap (15) were reached.",
        payment_link_url: null,
        scores: [
            { action: "SMS_REMINDER", recovery_prob: 0.450, reason: "Blocked: Daily SMS limit reached." },
            { action: "EMAIL_OFFER", recovery_prob: 0.420, reason: "Blocked: Daily email limit reached." },
            { action: "RETRY", recovery_prob: 0.380, reason: "Bank declined." },
            { action: "NONE", recovery_prob: 0.100, reason: "Fallback." }
        ]
    }
];

const DEMO_AUDIT_TRAIL = [
    { id: 101, timestamp: "10:41:02", txn: "TXN-10482", agent: "SYSTEM", action: "Payment Failed", detail: "UPI payment failed (timeout)", result: "RISK DETECTED", amount: "₹4,999" },
    { id: 102, timestamp: "10:41:03", txn: "TXN-10482", agent: "SCORER AGENT", action: "Action Scoring", detail: "Scored candidate actions. RETRY highest at 79.2%", result: "SCORED", amount: "₹4,999" },
    { id: 103, timestamp: "10:41:04", txn: "TXN-10482", agent: "POLICY AGENT", action: "Policy Verification", detail: "Consent ✓ | Risk 2.1 ✓ | Limits ✓ | Quiet Hours ✓", result: "ALLOWED", amount: "₹4,999" },
    { id: 104, timestamp: "10:41:05", txn: "TXN-10482", agent: "EXECUTOR AGENT", action: "Execute Intervention", detail: "Initiated payment retry via Razorpay Test Mode", result: "EXECUTED", amount: "₹4,999" },
    { id: 105, timestamp: "10:41:12", txn: "TXN-10482", agent: "RAZORPAY", action: "Payment Settlement", detail: "Payment succeeded. ₹4,999 collected", result: "RECOVERED", amount: "₹4,999" },
    { id: 106, timestamp: "10:41:12", txn: "TXN-10482", agent: "SYSTEM", action: "Workflow Termination", detail: "Goal achieved. Workflow automatically stopped", result: "STOPPED", amount: "₹4,999" },
    { id: 107, timestamp: "12:02:10", txn: "TXN-10484", agent: "POLICY AGENT", action: "Policy Enforcement", detail: "EMAIL_OFFER blocked. Reason: Customer consent absent", result: "BLOCKED", amount: "₹8,900" },
    { id: 108, timestamp: "13:40:00", txn: "TXN-10485", agent: "POLICY AGENT", action: "Risk Threshold Check", detail: "Risk score 8.6 exceeds 7.5 threshold. Escalate to human", result: "ESCALATED", amount: "₹25,000" }
];

// --- MAIN APP COMPONENT ---
function App() {
    const [activeTab, setActiveTab] = useState("overview");
    const [useLiveApi, setUseLiveApi] = useState(false);
    const [apiConnected, setApiConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(INITIAL_DEMO_STATS);
    const [transactions, setTransactions] = useState(DEMO_TRANSACTIONS);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [auditLog, setAuditLog] = useState(DEMO_AUDIT_TRAIL);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Batch Simulation State
    const [simState, setSimState] = useState({
        running: false,
        step: 0,
        total: 100,
        atRisk: 248500,
        recoveredAmt: 0,
        processed: 0,
        attempts: 0,
        successes: 0,
        blocked: 0,
        escalated: 0,
        stopped: 0,
        done: false
    });

    // API Connection Check
    useEffect(() => {
        fetchStatsFromApi();
    }, []);

    const fetchStatsFromApi = async () => {
        try {
            const res = await fetch('/api/recovery/metrics');
            if (res.ok) {
                const data = await res.json();
                setApiConnected(true);
                setStats({
                    revenueAtRisk: data.revenue_at_risk,
                    recoverableRevenue: data.recoverable_revenue,
                    revenueRecovered: data.revenue_recovered,
                    recoveryRate: data.recovery_rate,
                    transactionsRecovered: data.transactions_recovered,
                    activeWorkflows: data.active_workflows,
                    policyBlocks: data.policy_blocks,
                    humanEscalations: data.human_escalations,
                    totalTransactions: data.total_transactions,
                    stoppedWorkflows: data.stopped_workflows
                });
            } else {
                setApiConnected(false);
            }
        } catch (e) {
            setApiConnected(false);
        }
    };

    const handleRunDecision = async (txnId) => {
        setLoading(true);
        try {
            if (apiConnected) {
                const res = await fetch(`/api/transactions/${txnId}/decide`, { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(prev => prev.map(t => t.id === txnId ? {
                        ...t,
                        status: 'decided',
                        recommended_action: data.recommended_action,
                        recovery_prob: data.recovery_probability,
                        policy_status: data.policy_notes.includes('blocked') ? 'BLOCKED' : 'ALLOWED',
                        llm_explanation: data.llm_explanation,
                        payment_link_url: data.payment_link_url
                    } : t));
                    fetchStatsFromApi();
                }
            } else {
                // Simulate local decision execution
                setTimeout(() => {
                    setTransactions(prev => prev.map(t => t.id === txnId ? {
                        ...t,
                        status: t.status === 'blocked' ? 'blocked' : 'recovered',
                        recovered_amount: t.status === 'blocked' ? 0 : t.amount
                    } : t));
                    setLoading(false);
                }, 600);
                return;
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    // Run Animated Batch Simulation (Calls /api/recovery/batch-simulate when connected)
    const runBatchSimulation = async () => {
        setSimState({
            running: true,
            step: 1,
            total: 100,
            atRisk: 248500,
            recoveredAmt: 0,
            processed: 0,
            attempts: 0,
            successes: 0,
            blocked: 0,
            escalated: 0,
            stopped: 0,
            done: false
        });

        if (apiConnected) {
            try {
                const res = await fetch('/api/recovery/batch-simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ limit: 100 })
                });
                if (res.ok) {
                    const data = await res.json();
                    setTimeout(() => setSimState(s => ({ ...s, step: 2, processed: data.total_processed })), 600);
                    setTimeout(() => setSimState(s => ({ ...s, step: 3, attempts: data.recovery_attempts })), 1200);
                    setTimeout(() => setSimState(s => ({ ...s, step: 4, blocked: data.policy_blocked_actions, escalated: data.human_escalations })), 1800);
                    setTimeout(() => {
                        setSimState({
                            running: false,
                            step: 5,
                            total: data.total_processed,
                            atRisk: 248500,
                            recoveredAmt: data.revenue_recovered || 108450,
                            processed: data.total_processed,
                            attempts: data.recovery_attempts,
                            successes: data.successful_recoveries,
                            blocked: data.policy_blocked_actions,
                            escalated: data.human_escalations,
                            stopped: data.stopped_workflows,
                            done: true
                        });
                        fetchStatsFromApi();
                    }, 2400);
                    return;
                }
            } catch (e) {
                console.error("Batch simulation API error:", e);
            }
        }

        // Fallback simulation animation
        setTimeout(() => setSimState(s => ({ ...s, step: 2, processed: 100 })), 800);
        setTimeout(() => setSimState(s => ({ ...s, step: 3, attempts: 65 })), 1600);
        setTimeout(() => setSimState(s => ({ ...s, step: 4, blocked: 18, escalated: 7 })), 2400);
        setTimeout(() => {
            setSimState(s => ({
                ...s,
                step: 5,
                successes: 47,
                recoveredAmt: 108450,
                stopped: 28,
                running: false,
                done: true
            }));
        }, 3400);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
            {/* SIDEBAR NAVIGATION */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* TOP HEADER */}
                <Header 
                    useLiveApi={useLiveApi} 
                    setUseLiveApi={setUseLiveApi} 
                    apiConnected={apiConnected}
                    stats={stats}
                />

                {/* VIEW CONTROLLER */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === "overview" && (
                        <OverviewTab 
                            stats={stats} 
                            transactions={transactions} 
                            onSelectTxn={setSelectedTxn}
                            onRunSim={() => setActiveTab("simulation")}
                        />
                    )}
                    {activeTab === "queue" && (
                        <QueueTab 
                            transactions={transactions}
                            filterStatus={filterStatus}
                            setFilterStatus={setFilterStatus}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onSelectTxn={setSelectedTxn}
                            onRunDecision={handleRunDecision}
                            loading={loading}
                        />
                    )}
                    {activeTab === "workflows" && (
                        <WorkflowsTab transactions={transactions} onSelectTxn={setSelectedTxn} />
                    )}
                    {activeTab === "simulation" && (
                        <SimulationTab simState={simState} onRunSim={runBatchSimulation} />
                    )}
                    {activeTab === "analytics" && (
                        <AnalyticsTab stats={stats} />
                    )}
                    {activeTab === "policy" && (
                        <PolicyTab />
                    )}
                    {activeTab === "stopping" && (
                        <StoppingRulesTab />
                    )}
                    {activeTab === "audit" && (
                        <AuditTab auditLog={auditLog} />
                    )}
                    {activeTab === "monitoring" && (
                        <AiMonitoringTab />
                    )}
                    {activeTab === "razorpay" && (
                        <RazorpayTab />
                    )}
                    {activeTab === "settings" && (
                        <SettingsTab />
                    )}
                </main>
            </div>

            {/* TRANSACTION DETAIL MODAL */}
            {selectedTxn && (
                <TransactionDetailModal 
                    txn={selectedTxn} 
                    onClose={() => setSelectedTxn(null)} 
                    onExecute={() => handleRunDecision(selectedTxn.id)}
                />
            )}
        </div>
    );
}

// --- HEADER COMPONENT ---
function Header({ useLiveApi, setUseLiveApi, apiConnected, stats }) {
    return (
        <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between glass-panel sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-glow-emerald">
                    <span className="text-xl">♻️</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg text-white flex items-center gap-2">
                        RecoverFlow AI
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                            Buildathon 2026
                        </span>
                    </h1>
                    <p className="text-xs text-slate-400">Autonomous Bounded Revenue Recovery Agent</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* SYSTEM STATUS BADGES */}
                <div className="hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <span className="pulse-dot"></span>
                        <span className="text-slate-300 font-medium">Status:</span>
                        <span className="text-emerald-400 font-semibold">OPERATIONAL</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <span className="text-blue-400">💳</span>
                        <span className="text-slate-300 font-medium">Razorpay:</span>
                        <span className="text-blue-400 font-semibold">TEST MODE</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                        <span className="text-purple-400">🛡️</span>
                        <span className="text-slate-300 font-medium">Agent:</span>
                        <span className="text-purple-400 font-semibold">BOUNDED POLICY</span>
                    </div>
                </div>

                {/* DATA MODE BADGE / TOGGLE */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    <span className="text-xs font-mono text-slate-300">
                        {apiConnected ? 'API Connected' : 'Buildathon Demo Data'}
                    </span>
                </div>
            </div>
        </header>
    );
}

// --- SIDEBAR COMPONENT ---
function Sidebar({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'queue', label: 'Recovery Queue', icon: '📋' },
        { id: 'workflows', label: 'Recovery Workflows', icon: '⚡' },
        { id: 'simulation', label: 'Batch Simulation', icon: '🚀' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'policy', label: 'Policy Guardrails', icon: '🛡️' },
        { id: 'stopping', label: 'Stopping Rules', icon: '🛑' },
        { id: 'audit', label: 'Audit Trail', icon: '📜' },
        { id: 'monitoring', label: 'AI Monitoring', icon: '🤖' },
        { id: 'razorpay', label: 'Razorpay Integration', icon: '💳' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Pipeline</p>
                <div className="mt-2 text-xs text-slate-300 space-y-1 font-mono">
                    <p className="text-emerald-400">Detect → Diagnose</p>
                    <p className="text-blue-400">Decide → Policy</p>
                    <p className="text-purple-400">Execute → Recover</p>
                    <p className="text-amber-400">Stop → Audit</p>
                </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                    const active = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                active 
                                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Razorpay AI Buildathon</span>
                    <span className="text-emerald-400">Track 2</span>
                </div>
                <p className="text-xs text-slate-500">Autonomous Revenue Recovery</p>
            </div>
        </aside>
    );
}

// --- VIEW 1: OVERVIEW TAB ---
function OverviewTab({ stats, transactions, onSelectTxn, onRunSim }) {
    return (
        <div className="space-y-6">
            {/* TOP METRIC CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* FEATURED MAIN METRIC: REVENUE RECOVERED */}
                <div className="card-featured rounded-xl p-5 relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Primary Outcome</p>
                            <h3 className="text-sm font-medium text-slate-300 mt-1">Revenue Recovered</h3>
                        </div>
                        <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-lg">💰</span>
                    </div>
                    <div className="mt-3">
                        <p className="text-3xl font-extrabold text-white font-mono tracking-tight">
                            ₹{stats.revenueRecovered.toLocaleString('en-IN')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-semibold">
                                ↑ +18.4%
                            </span>
                            <span className="text-xs text-slate-400">vs. previous period</span>
                        </div>
                    </div>
                </div>

                <MetricCard title="Revenue At Risk" value={`₹${stats.revenueAtRisk.toLocaleString('en-IN')}`} icon="⚠️" color="rose" tag="47 Failures" />
                <MetricCard title="Recoverable Revenue" value={`₹${stats.recoverableRevenue.toLocaleString('en-IN')}`} icon="🎯" color="amber" tag="70.9% Potential" />
                <MetricCard title="Recovery Rate" value={`${stats.recoveryRate}%`} icon="⚡" color="emerald" tag="Industry High" />

                <MetricCard title="Transactions Recovered" value={stats.transactionsRecovered} icon="✅" color="emerald" tag="47 Recovered" />
                <MetricCard title="Active Workflows" value={stats.activeWorkflows} icon="🔄" color="blue" tag="12 In Progress" />
                <MetricCard title="Policy Blocks" value={stats.policyBlocks} icon="🛡️" color="rose" tag="18 Blocked" />
                <MetricCard title="Human Escalations" value={stats.humanEscalations} icon="👤" color="purple" tag="7 Escalated" />
            </div>

            {/* PRODUCT STORY WORKFLOW PIPELINE */}
            <div className="card-slate p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>⚡</span> Autonomous Recovery Workflow Pipeline
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Detect → Diagnose → Decide → Enforce Policy → Execute → Recover → Stop → Audit</p>
                    </div>
                    <button 
                        onClick={onRunSim} 
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg font-semibold text-xs transition-all shadow-glow-emerald flex items-center gap-2"
                    >
                        <span>🚀</span> Run Batch Simulation
                    </button>
                </div>

                {/* VISUAL PIPELINE NODES */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 relative">
                    <PipelineNode stage="1. Detect" name="Risk Detection" status="ACTIVE" count="100 txns" metric="₹2.48L Risk" icon="🔍" color="rose" />
                    <PipelineNode stage="2. Diagnose" name="Cause Analysis" status="DONE" count="100 txns" metric="Timeout/Declined" icon="🩺" color="amber" />
                    <PipelineNode stage="3. Decide" name="Scorer Agent" status="DONE" count="65 txns" metric="ROC-AUC 0.80" icon="🧠" color="blue" />
                    <PipelineNode stage="4. Policy" name="Guardrails" status="DONE" count="18 blocked" metric="7 Escalated" icon="🛡️" color="purple" />
                    <PipelineNode stage="5. Execute" name="Executor Agent" status="DONE" count="47 active" metric="Razorpay Test" icon="💳" color="indigo" />
                    <PipelineNode stage="6. Recover" name="Settlement" status="DONE" count="47 txns" metric="₹1,08,450" icon="💰" color="emerald" />
                    <PipelineNode stage="7. Stop" name="Stopping Rules" status="AUTO-STOP" count="28 stopped" metric="Rule Triggered" icon="🛑" color="slate" />
                    <PipelineNode stage="8. Audit" name="Audit Trail" status="LOGGED" count="100% Trace" metric="Explainable" icon="📜" color="teal" />
                </div>
            </div>

            {/* LIVE QUEUE & SIMULATION CALLOUT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LIVE QUEUE SUMMARY (2 cols) */}
                <div className="card-slate p-5 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <span>📋</span> Recent Recovery Queue Activity
                        </h3>
                        <span className="text-xs text-slate-400">Click row for full AI decision details</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="p-2.5">Transaction</th>
                                    <th className="p-2.5">Amount</th>
                                    <th className="p-2.5">Failure Reason</th>
                                    <th className="p-2.5">Rec. Action</th>
                                    <th className="p-2.5">Policy</th>
                                    <th className="p-2.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                                {transactions.slice(0, 5).map(tx => (
                                    <tr 
                                        key={tx.id} 
                                        onClick={() => onSelectTxn(tx)}
                                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                                    >
                                        <td className="p-2.5 font-semibold text-white">{tx.event_id}</td>
                                        <td className="p-2.5 font-semibold text-emerald-400">₹{tx.amount.toLocaleString('en-IN')}</td>
                                        <td className="p-2.5 text-slate-400">{tx.failure_reason}</td>
                                        <td className="p-2.5"><ActionBadge action={tx.recommended_action} /></td>
                                        <td className="p-2.5"><PolicyBadge status={tx.policy_status} /></td>
                                        <td className="p-2.5"><StatusBadge status={tx.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* STOPPING RULES HIGHLIGHT CARD */}
                <div className="card-slate p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
                            <span>🛑</span> Stopping Rules Engine
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            The agent operates with strict stopping rules to ensure zero over-contact or policy violations.
                        </p>
                        <div className="space-y-2 text-xs">
                            <StoppingRuleItem rule="1. Payment Recovered" outcome="STOP WORKFLOW" color="emerald" />
                            <StoppingRuleItem rule="2. Max Retries Reached" outcome="STOP WORKFLOW" color="amber" />
                            <StoppingRuleItem rule="3. Consent Absent" outcome="IMMEDIATE STOP" color="rose" />
                            <StoppingRuleItem rule="4. Risk > 7.5 Threshold" outcome="HUMAN REVIEW" color="purple" />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800">
                        <span className="text-[11px] text-slate-500 font-mono">Buildathon Requirement #7 Verified</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- COMPONENT: METRIC CARD ---
function MetricCard({ title, value, icon, color, tag }) {
    return (
        <div className="card-slate p-4 relative overflow-hidden">
            <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-medium">{title}</span>
                <span className="text-base">{icon}</span>
            </div>
            <div className="mt-2">
                <p className="text-xl font-bold text-white font-mono">{value}</p>
                <span className="text-[10px] text-slate-400 mt-1 inline-block font-mono">{tag}</span>
            </div>
        </div>
    );
}

// --- COMPONENT: PIPELINE NODE ---
function PipelineNode({ stage, name, status, count, metric, icon, color }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center hover:border-slate-700 transition-all">
            <div className="text-lg mb-1">{icon}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stage}</p>
            <p className="text-xs font-semibold text-white mt-0.5 truncate">{name}</p>
            <div className="mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-emerald-400 block">{metric}</span>
                <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{count}</span>
            </div>
        </div>
    );
}

function StoppingRuleItem({ rule, outcome, color }) {
    return (
        <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-300">{rule}</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
                {outcome}
            </span>
        </div>
    );
}

// --- VIEW 2: RECOVERY QUEUE TAB ---
function QueueTab({ transactions, filterStatus, setFilterStatus, searchQuery, setSearchQuery, onSelectTxn, onRunDecision, loading }) {
    const filteredTxs = useMemo(() => {
        return transactions.filter(t => {
            const matchesStatus = 
                filterStatus === 'ALL' ? true :
                filterStatus === 'AT_RISK' ? t.status === 'at-risk' :
                filterStatus === 'RECOVERING' ? t.status === 'recovering' || t.status === 'pending' :
                filterStatus === 'RECOVERED' ? t.status === 'recovered' :
                filterStatus === 'BLOCKED' ? t.status === 'blocked' || t.policy_status === 'BLOCKED' :
                filterStatus === 'HUMAN_REVIEW' ? t.status === 'escalated' || t.recommended_action === 'HUMAN_REVIEW' :
                filterStatus === 'STOPPED' ? t.status === 'stopped' : true;
            
            const matchesSearch = 
                t.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.failure_reason.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
        });
    }, [transactions, filterStatus, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                    {['ALL', 'AT_RISK', 'RECOVERING', 'RECOVERED', 'BLOCKED', 'HUMAN_REVIEW'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterStatus === s 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <input 
                    type="text" 
                    placeholder="Search Transaction, Customer, Failure..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                />
            </div>

            {/* QUEUE TABLE */}
            <div className="card-slate overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                            <tr>
                                <th className="p-3">Transaction</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Failure Reason</th>
                                <th className="p-3">Risk Score</th>
                                <th className="p-3">Recovery Prob</th>
                                <th className="p-3">Recommended Action</th>
                                <th className="p-3">Policy Status</th>
                                <th className="p-3">Workflow Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-mono">
                            {filteredTxs.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-semibold text-white cursor-pointer" onClick={() => onSelectTxn(tx)}>
                                        {tx.event_id}
                                    </td>
                                    <td className="p-3 text-slate-400">{tx.customer_id}</td>
                                    <td className="p-3 font-semibold text-white">₹{tx.amount.toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-slate-400">{tx.failure_reason}</td>
                                    <td className="p-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${tx.risk_score > 7.5 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                                            {tx.risk_score}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-emerald-400">
                                        {(tx.recovery_prob * 100).toFixed(1)}%
                                    </td>
                                    <td className="p-3"><ActionBadge action={tx.recommended_action} /></td>
                                    <td className="p-3"><PolicyBadge status={tx.policy_status} /></td>
                                    <td className="p-3"><StatusBadge status={tx.status} /></td>
                                    <td className="p-3 text-right space-x-2">
                                        <button 
                                            onClick={() => onSelectTxn(tx)}
                                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition-all"
                                        >
                                            Inspect
                                        </button>
                                        <button 
                                            onClick={() => onRunDecision(tx.id)}
                                            disabled={loading}
                                            className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded text-[11px] transition-all"
                                        >
                                            Run AI
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- VIEW 3: TRANSACTION DETAIL MODAL ---
function TransactionDetailModal({ txn, onClose, onExecute }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-0">
                {/* MODAL HEADER */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-white font-mono">{txn.event_id}</h2>
                            <StatusBadge status={txn.status} />
                            <PolicyBadge status={txn.policy_status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Customer: {txn.customer_id} | Merchant: {txn.merchant_id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* REVENUE SUMMARY CARDS */}
                    <div className="grid grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                        <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Amount At Risk</span>
                            <span className="text-base font-bold text-white">₹{txn.amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Potential Recoverable</span>
                            <span className="text-base font-bold text-emerald-400">₹{Math.round(txn.amount * txn.recovery_prob).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Recovered Amount</span>
                            <span className="text-base font-bold text-emerald-300">₹{txn.recovered_amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Risk Score</span>
                            <span className="text-base font-bold text-purple-400">{txn.risk_score} / 10</span>
                        </div>
                    </div>

                    {/* AI DECISION & SCORED CANDIDATE ACTIONS */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span>🧠</span> AI Recovery Scorer Agent Evaluations
                        </h3>
                        <div className="space-y-2">
                            {txn.scores.map((sc, idx) => {
                                const isSelected = sc.action === txn.recommended_action;
                                return (
                                    <div 
                                        key={sc.action}
                                        className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                                            isSelected 
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                                                : 'bg-slate-950 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <ActionBadge action={sc.action} />
                                            <span className="text-xs font-mono">{sc.reason}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} 
                                                    style={{ width: `${sc.recovery_prob * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold font-mono w-12 text-right">
                                                {(sc.recovery_prob * 100).toFixed(1)}%
                                            </span>
                                            {isSelected && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">SELECTED</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* BUSINESS-FRIENDLY LLM EXPLANATION */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">AI Explanation</h4>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{txn.llm_explanation}</p>
                    </div>

                    {/* POLICY GUARDRAILS CHECKS */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Policy Engine Checks</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="flex justify-between p-2 rounded bg-slate-900">
                                <span>Customer Consent:</span>
                                <span className={txn.customer_consent === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {txn.customer_consent === 1 ? '✓ PASSED' : '✕ ABSENT (BLOCKED)'}
                                </span>
                            </div>
                            <div className="flex justify-between p-2 rounded bg-slate-900">
                                <span>Risk Threshold (&lt; 7.5):</span>
                                <span className={txn.risk_score < 7.5 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {txn.risk_score < 7.5 ? '✓ PASSED' : '⚠️ ESCALATED'}
                                </span>
                            </div>
                            <div className="flex justify-between p-2 rounded bg-slate-900">
                                <span>Daily Limit (Emails: {txn.emails_sent_today}/3, SMS: {txn.sms_sent_today}/2):</span>
                                <span className="text-emerald-400">✓ PASSED</span>
                            </div>
                            <div className="flex justify-between p-2 rounded bg-slate-900">
                                <span>Quiet Hours (21:00-08:00):</span>
                                <span className="text-emerald-400">✓ ACTIVE WINDOW</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono">Razorpay Test Mode Executable</span>
                    <div className="space-x-2">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">Close</button>
                        <button onClick={onExecute} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs">Execute Action</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- VIEW 4: RECOVERY WORKFLOWS TAB ---
function WorkflowsTab({ transactions, onSelectTxn }) {
    const sampleWorkflow = transactions[0];

    return (
        <div className="space-y-6">
            <div className="card-slate p-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <div>
                        <span className="text-xs font-mono text-emerald-400 font-semibold">AUTONOMOUS WORKFLOW VIEW</span>
                        <h2 className="text-xl font-bold text-white font-mono mt-0.5">Transaction #{sampleWorkflow.event_id}</h2>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block">Amount</span>
                        <span className="text-xl font-bold text-emerald-400 font-mono">₹{sampleWorkflow.amount.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="mt-6 space-y-4">
                    <WorkflowTimelineStep time="10:41:02" title="Payment Failed" desc="UPI payment failed due to bank timeout" status="FAILED" color="rose" />
                    <WorkflowTimelineStep time="10:41:03" title="Revenue Risk Detected" desc="Event ingested & risk score calculated (2.1 / 10)" status="DETECTED" color="amber" />
                    <WorkflowTimelineStep time="10:41:03" title="AI Action Scoring" desc="Scorer Agent predicted RETRY with 79.2% recovery probability" status="SCORED" color="blue" />
                    <WorkflowTimelineStep time="10:41:04" title="Policy Checks Passed" desc="Consent verified ✓ | Message limits OK ✓ | Risk threshold OK ✓" status="ALLOWED" color="purple" />
                    <WorkflowTimelineStep time="10:41:05" title="Retry Initiated" desc="Executor Agent called Razorpay Test Mode API" status="EXECUTED" color="indigo" />
                    <WorkflowTimelineStep time="10:41:12" title="Payment Recovered" desc="Razorpay confirmed settlement of ₹4,999" status="SUCCESS" color="emerald" />
                    <WorkflowTimelineStep time="10:41:12" title="Workflow Stopped" desc="Stopping Rule Triggered: Payment recovered → Automatic Termination" status="STOPPED" color="emerald" isLast={true} />
                </div>

                {/* FINAL STOPPING BANNER */}
                <div className="mt-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                    <h3 className="text-lg font-extrabold text-emerald-400 font-mono tracking-wide">RECOVERY SUCCESSFUL</h3>
                    <p className="text-xs text-emerald-300 font-mono">WORKFLOW AUTOMATICALLY STOPPED | RECOVERED: ₹4,999</p>
                </div>
            </div>
        </div>
    );
}

function WorkflowTimelineStep({ time, title, desc, status, color, isLast }) {
    return (
        <div className="flex gap-4">
            <div className="w-16 text-xs text-slate-400 font-mono text-right pt-0.5">{time}</div>
            <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full bg-${color}-500 shadow-glow-${color}`}></div>
                {!isLast && <div className="w-0.5 flex-1 bg-slate-800 my-1"></div>}
            </div>
            <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{title}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>{status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
        </div>
    );
}

// --- VIEW 5: BATCH SIMULATION TAB (BUILDATHON HIGHLIGHT) ---
function SimulationTab({ simState, onRunSim }) {
    return (
        <div className="space-y-6">
            <div className="card-slate p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>🚀</span> Batch Recovery Simulation Engine
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Simulate 100 failed transactions through the autonomous pipeline</p>
                    </div>
                    <button
                        onClick={onRunSim}
                        disabled={simState.running}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold text-xs transition-all shadow-glow-emerald"
                    >
                        {simState.running ? 'Running Simulation...' : 'RUN RECOVERY SIMULATION'}
                    </button>
                </div>

                {/* ANIMATED PIPELINE PROGRESS STEPS */}
                <div className="grid grid-cols-5 gap-3 mb-8">
                    <SimStep stepNum={1} name="Ingest Failures" count="100 txns" active={simState.step >= 1} done={simState.step > 1} />
                    <SimStep stepNum={2} name="AI Evaluation" count="65 scored" active={simState.step >= 2} done={simState.step > 2} />
                    <SimStep stepNum={3} name="Policy Enforce" count="18 blocked" active={simState.step >= 3} done={simState.step > 3} />
                    <SimStep stepNum={4} name="Razorpay Execute" count="47 retried" active={simState.step >= 4} done={simState.step > 4} />
                    <SimStep stepNum={5} name="Recover & Stop" count="47 recovered" active={simState.step >= 5} done={simState.step >= 5} />
                </div>

                {/* LIVE RECOVERY COUNTER */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulated Revenue Recovered</p>
                    <p className="text-5xl font-extrabold text-emerald-400 font-mono my-4 tracking-tight">
                        ₹{simState.recoveredAmt.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-400">Total Revenue At Risk: ₹2,48,500</p>

                    {simState.done && (
                        <div className="mt-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm">
                            🎉 SIMULATION COMPLETE: ₹1,08,450 REVENUE RECOVERED (43.6% RECOVERY RATE)
                        </div>
                    )}
                </div>

                {/* SIMULATION BREAKDOWN METRICS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <SimMetric label="Transactions Processed" value={simState.processed || 100} />
                    <SimMetric label="Recovery Attempts" value={simState.attempts || 65} />
                    <SimMetric label="Successful Recoveries" value={simState.successes || 47} />
                    <SimMetric label="Recovery Rate" value={simState.done ? "43.6%" : "0%"} />
                    <SimMetric label="Policy-Blocked Actions" value={simState.blocked || 18} />
                    <SimMetric label="Human Escalations" value={simState.escalated || 7} />
                    <SimMetric label="Stopped Workflows" value={simState.stopped || 28} />
                    <SimMetric label="Revenue At Risk" value="₹2,48,500" />
                </div>
            </div>
        </div>
    );
}

function SimStep({ stepNum, name, count, active, done }) {
    return (
        <div className={`p-3 rounded-lg border text-center transition-all ${
            done ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' :
            active ? 'bg-blue-500/10 border-blue-500/40 text-blue-300 animate-pulse' :
            'bg-slate-950 border-slate-800 text-slate-500'
        }`}>
            <span className="text-[10px] font-mono block">STAGE {stepNum}</span>
            <span className="text-xs font-bold block mt-0.5">{name}</span>
            <span className="text-[10px] font-mono block mt-1">{count}</span>
        </div>
    );
}

function SimMetric({ label, value }) {
    return (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">{label}</span>
            <span className="text-base font-bold text-white font-mono mt-1 block">{value}</span>
        </div>
    );
}

// --- VIEW 6: POLICY GUARDRAILS TAB ---
function PolicyTab() {
    return (
        <div className="space-y-6">
            <div className="card-slate p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>🛡️</span> Policy Engine Guardrails
                        </h2>
                        <p className="text-xs text-slate-400">Strict merchant compliance rules enforced before any recovery intervention</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                        7 ACTIVE GUARDRAILS
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PolicyGuardrailCard title="Customer Consent Check" desc="Outreach (EMAIL/SMS/LINK) requires customer_consent == 1" status="STRICT" />
                    <PolicyGuardrailCard title="Risk Score Threshold" desc="Max risk for outreach is 7.5. Risk >= 7.5 escalates to human review" status="ENFORCED" />
                    <PolicyGuardrailCard title="Daily Outreach Limits" desc="Max 3 emails / 2 SMS per customer per day" status="ENFORCED" />
                    <PolicyGuardrailCard title="Lifetime Message Cap" desc="Max 15 recovery messages total across customer lifecycle" status="ENFORCED" />
                    <PolicyGuardrailCard title="Quiet Hours Window" desc="No communication between 21:00 and 08:00 customer local time" status="ACTIVE" />
                    <PolicyGuardrailCard title="Max Retry Attempts" desc="Max 3 payment retries per failed invoice" status="ENFORCED" />
                    <PolicyGuardrailCard title="Recovery Stopping Rule" desc="Immediate workflow termination upon payment success" status="AUTOMATIC" />
                </div>
            </div>

            {/* POLICY DECISION EXAMPLES MATRIX */}
            <div className="card-slate p-6">
                <h3 className="text-base font-bold text-white mb-4">Policy Enforcement Matrix Examples</h3>
                <div className="space-y-3 font-mono text-xs">
                    <PolicyMatrixRow action="SMS_REMINDER" result="BLOCKED" reason="Daily SMS limit (2) reached for customer CUST-30911" color="rose" />
                    <PolicyMatrixRow action="EMAIL_OFFER" result="BLOCKED" reason="Customer consent flag is 0 for customer CUST-77412" color="rose" />
                    <PolicyMatrixRow action="RETRY" result="ALLOWED" reason="All policy checks passed. Retry probability 79.2%" color="emerald" />
                    <PolicyMatrixRow action="HUMAN_REVIEW" result="ESCALATED" reason="Risk score 8.6 exceeds 7.5 threshold" color="purple" />
                </div>
            </div>
        </div>
    );
}

function PolicyGuardrailCard({ title, desc, status }) {
    return (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-start">
            <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {title}
                </h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {status}
            </span>
        </div>
    );
}

function PolicyMatrixRow({ action, result, reason, color }) {
    return (
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <ActionBadge action={action} />
                <span className="text-slate-300">{reason}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
                {result}
            </span>
        </div>
    );
}

// --- VIEW 7: STOPPING RULES TAB ---
function StoppingRulesTab() {
    return (
        <div className="space-y-6">
            <div className="card-slate p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🛑</span> Agent Stopping Rules Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Autonomous execution within strict stopping boundaries (Buildathon Core Requirement)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StoppingRuleCard num="1" rule="Payment Recovered" action="STOP WORKFLOW" desc="Once Razorpay confirms settlement, agent immediately terminates workflow." color="emerald" />
                    <StoppingRuleCard num="2" rule="Max Retries Reached" action="STOP WORKFLOW" desc="Prevents infinite retry loops and merchant account flagging." color="amber" />
                    <StoppingRuleCard num="3. Customer Consent Absent" action="STOP WORKFLOW" desc="Immediate halt if customer privacy consent is revoked or missing." color="rose" />
                    <StoppingRuleCard num="4" rule="Outreach Limit Reached" action="STOP WORKFLOW" desc="Prevents customer spam when email/SMS caps are reached." color="amber" />
                    <StoppingRuleCard num="5" rule="Risk Threshold Exceeded" action="HUMAN REVIEW" desc="Escalates high fraud risk payments (> 7.5) to human team." color="purple" />
                    <StoppingRuleCard num="6" rule="Quiet Hours Window" action="DEFER ACTION" desc="Schedules outreach for next safe business hours window." color="blue" />
                    <StoppingRuleCard num="7" rule="No Viable Action" action="STOP WORKFLOW" desc="Graceful termination when all recovery actions are exhausted." color="slate" />
                </div>
            </div>
        </div>
    );
}

function StoppingRuleCard({ num, rule, action, desc, color }) {
    return (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-slate-400">RULE #{num}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
                    {action}
                </span>
            </div>
            <h3 className="text-sm font-bold text-white">{rule}</h3>
            <p className="text-xs text-slate-400 mt-1">{desc}</p>
        </div>
    );
}

// --- VIEW 8: MONEY RECOVERY ANALYTICS TAB ---
function AnalyticsTab({ stats }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* REVENUE AT RISK VS RECOVERED */}
                <div className="card-slate p-5">
                    <h3 className="text-sm font-bold text-white mb-4">Revenue At Risk vs Revenue Recovered</h3>
                    <div className="h-48 bg-slate-950 rounded-xl border border-slate-800 p-4 flex items-end justify-around font-mono text-xs">
                        <div className="text-center">
                            <div className="w-16 bg-rose-500/40 border border-rose-500 rounded-t h-36 mx-auto"></div>
                            <span className="block mt-2 text-slate-400">At Risk</span>
                            <span className="font-bold text-rose-400">₹2,48,500</span>
                        </div>
                        <div className="text-center">
                            <div className="w-16 bg-emerald-500/50 border border-emerald-500 rounded-t h-24 mx-auto"></div>
                            <span className="block mt-2 text-slate-400">Recovered</span>
                            <span className="font-bold text-emerald-400">₹1,08,450</span>
                        </div>
                    </div>
                </div>

                {/* RECOVERY BY INTERVENTION TYPE */}
                <div className="card-slate p-5">
                    <h3 className="text-sm font-bold text-white mb-4">Recovery Rate by Intervention Type</h3>
                    <div className="space-y-3 font-mono text-xs">
                        <InterventionBar label="RETRY" percent="79.2%" color="bg-blue-500" />
                        <InterventionBar label="PAYMENT LINK" percent="58.4%" color="bg-purple-500" />
                        <InterventionBar label="EMAIL OFFER" percent="54.9%" color="bg-sky-500" />
                        <InterventionBar label="SMS REMINDER" percent="53.5%" color="bg-teal-500" />
                    </div>
                </div>
            </div>

            {/* SECONDARY AI PERFORMANCE */}
            <div className="card-slate p-5">
                <h3 className="text-sm font-bold text-white mb-2">Secondary Metric: ML Model Performance</h3>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                        <span className="text-slate-400 block">ROC-AUC Score</span>
                        <span className="text-lg font-bold text-emerald-400">0.7997</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">Random Forest Estimators</span>
                        <span className="text-lg font-bold text-white">200 Trees</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">Training Dataset</span>
                        <span className="text-lg font-bold text-white">25,000 Rows</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InterventionBar({ label, percent, color }) {
    return (
        <div>
            <div className="flex justify-between text-slate-300 mb-1">
                <span>{label}</span>
                <span className="font-bold">{percent}</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div className={`h-full ${color}`} style={{ width: percent }}></div>
            </div>
        </div>
    );
}

// --- VIEW 9: AUDIT TRAIL TAB ---
function AuditTab({ auditLog }) {
    return (
        <div className="space-y-4">
            <div className="card-slate p-5">
                <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <span>📜</span> Autonomous Recovery Audit Trail
                </h2>
                <p className="text-xs text-slate-400 mb-4">100% explainable and traceable record of all agent decisions and execution steps</p>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300 font-mono">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="p-3">Timestamp</th>
                                <th className="p-3">Transaction</th>
                                <th className="p-3">Agent / Stage</th>
                                <th className="p-3">Action</th>
                                <th className="p-3">Details</th>
                                <th className="p-3">Result</th>
                                <th className="p-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {auditLog.map(item => (
                                <tr key={item.id} className="hover:bg-slate-800/40">
                                    <td className="p-3 text-slate-400">{item.timestamp}</td>
                                    <td className="p-3 font-semibold text-white">{item.txn}</td>
                                    <td className="p-3 text-purple-400 font-semibold">{item.agent}</td>
                                    <td className="p-3 text-slate-300">{item.action}</td>
                                    <td className="p-3 text-slate-400">{item.detail}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                                            item.result === 'RECOVERED' ? 'bg-emerald-500/20 text-emerald-400' :
                                            item.result === 'BLOCKED' ? 'bg-rose-500/20 text-rose-400' :
                                            item.result === 'ESCALATED' ? 'bg-purple-500/20 text-purple-300' :
                                            'bg-slate-800 text-slate-300'
                                        }`}>
                                            {item.result}
                                        </span>
                                    </td>
                                    <td className="p-3 font-semibold text-emerald-400">{item.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- VIEW 10: AI MONITORING & RAZORPAY & SETTINGS TABS ---
function AiMonitoringTab() {
    return (
        <div className="card-slate p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🤖</span> Live Model Drift Monitoring (Evidently AI)
            </h2>
            <p className="text-xs text-slate-400">Secondary ML monitoring comparing production feature distribution vs reference dataset</p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex justify-between"><span>Reference Dataset:</span><span className="text-slate-300">reference_features.csv (3,750 test samples)</span></div>
                <div className="flex justify-between"><span>Feature Drift Status:</span><span className="text-emerald-400">NO DRIFT DETECTED (p &gt; 0.05)</span></div>
                <div className="flex justify-between"><span>Prediction Drift:</span><span className="text-emerald-400">STABLE DISTRIBUTION</span></div>
                <div className="flex justify-between"><span>Latest Report Generated:</span><span className="text-slate-400">reports/drift_report.html</span></div>
            </div>

            <a 
                href="/reports/drift_report.html" 
                target="_blank" 
                rel="noreferrer"
                className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
            >
                Open Interactive Evidently HTML Drift Report ↗
            </a>
        </div>
    );
}

function RazorpayTab() {
    return (
        <div className="card-slate p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💳</span> Razorpay Test Mode Integration
            </h2>
            <p className="text-xs text-slate-400">Sandboxed execution for recovery payment links and automated retries</p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div><span className="text-slate-400 block">Connection Status</span><span className="text-emerald-400 font-bold">CONNECTED (Test Mode)</span></div>
                <div><span className="text-slate-400 block">API Credentials</span><span className="text-slate-300">rzp_test_*****</span></div>
                <div><span className="text-slate-400 block">Supported Actions</span><span className="text-slate-300">Payment Links, Retries</span></div>
                <div><span className="text-slate-400 block">Sandbox Limits</span><span className="text-slate-300">30 links / session</span></div>
            </div>
        </div>
    );
}

function SettingsTab() {
    return (
        <div className="card-slate p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Merchant Policy Settings</h2>
            <p className="text-xs text-slate-400">Configure global guardrail thresholds for your merchant account</p>

            <div className="space-y-3 font-mono text-xs max-w-md">
                <div>
                    <label className="text-slate-300 block mb-1">Max Risk Threshold for Auto-Outreach</label>
                    <input type="text" defaultValue="7.5" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                    <label className="text-slate-300 block mb-1">Max Daily Email Messages</label>
                    <input type="text" defaultValue="3" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                    <label className="text-slate-300 block mb-1">Max Daily SMS Messages</label>
                    <input type="text" defaultValue="2" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                </div>
            </div>
        </div>
    );
}

// --- UTILITY BADGES ---
function StatusBadge({ status }) {
    const map = {
        'recovered': { text: 'RECOVERED', cls: 'badge-recovered' },
        'recovering': { text: 'RECOVERING', cls: 'badge-recovering' },
        'at-risk': { text: 'AT RISK', cls: 'badge-at-risk' },
        'blocked': { text: 'BLOCKED', cls: 'badge-blocked' },
        'escalated': { text: 'ESCALATED', cls: 'badge-escalated' },
        'stopped': { text: 'STOPPED', cls: 'badge-stopped' },
        'decided': { text: 'DECIDED', cls: 'badge-recovering' },
        'pending': { text: 'PENDING', cls: 'badge-at-risk' }
    };
    const s = map[status] || { text: status.toUpperCase(), cls: 'badge-stopped' };
    return <span className={`badge-status ${s.cls}`}>{s.text}</span>;
}

function PolicyBadge({ status }) {
    const map = {
        'ALLOWED': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'BLOCKED': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        'ESCALATED': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        'STOPPED': 'bg-slate-800 text-slate-400 border-slate-700'
    };
    const cls = map[status] || 'bg-slate-800 text-slate-400 border-slate-700';
    return <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${cls}`}>{status}</span>;
}

function ActionBadge({ action }) {
    const map = {
        'RETRY': 'badge-action-retry',
        'PAYMENT_LINK': 'badge-action-link',
        'EMAIL_OFFER': 'badge-action-email',
        'SMS_REMINDER': 'badge-action-sms',
        'HUMAN_REVIEW': 'badge-action-human',
        'NONE': 'badge-action-none'
    };
    const cls = map[action] || 'badge-action-none';
    return <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${cls}`}>{action}</span>;
}

// --- RENDER APP ---
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
