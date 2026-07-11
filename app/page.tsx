'use client';

import Navbar from './components/Navbar.js';

export default function CommentStudioPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/styles.css" />

      <Navbar 
        rightContent={
          <>
            <div className="hdr-stats">
              <div className="stat-pill"><span id="metricPosted">0</span> posted</div>
              <div className="stat-pill clr-amber"><span id="metricReview">0</span> to review</div>
              <div className="stat-pill clr-blue"><span id="metricDrafted">0</span> drafted</div>
              <div className="stat-pill" id="todayPill">0/<span id="metricDailyTarget">10</span> today</div>
            </div>
            <div className="hdr-actions">
              <button className="hdr-btn" id="exportCsvBtn">Export CSV</button>
              <button className="hdr-btn" id="exportJsonBtn">Export JSON</button>
              <button className="hdr-btn hdr-btn-icon" id="settingsToggle" title="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
            </div>
          </>
        }
      />

      {/* ══ MAIN LAYOUT ══ */}
      <div className="layout">
        {/* ── LEFT: HISTORY PANEL ── */}
        <aside className="history-panel">
          <div className="hp-top">
            <span className="hp-title">History</span>
            <button className="btn-new" id="newBtn">+ New</button>
          </div>
          <input type="text" id="queueSearch" className="hp-search" placeholder="Search…" />
          <div className="hp-filters">
            <button className="fchip active" data-filter="All">All</button>
            <button className="fchip" data-filter="Drafted">Draft</button>
            <button className="fchip" data-filter="Needs review">Review</button>
            <button className="fchip" data-filter="Posted">Posted</button>
          </div>
          <div className="hp-platform-filter">
            <select id="platformFilter" className="hp-pf-select">
              <option value="All">All platforms</option>
              <option value="reddit">Reddit</option>
              <option value="quora">Quora</option>
            </select>
          </div>
          <div id="queueList" className="hp-list"></div>
        </aside>

        {/* ── CENTER: WORK AREA ── */}
        <main className="work-area">
          {/* Navigation Tabs */}
          <div className="nav-tabs">
            <button className="nav-tab active" data-tab="studio">
              <span className="nav-tab-icon">✍️</span>
              <span className="nav-tab-text">
                <span className="nav-tab-title">Comment Studio</span>
                <span className="nav-tab-desc">Write natural comments</span>
              </span>
            </button>
            <button className="nav-tab" data-tab="leads">
              <span className="nav-tab-icon">🔍</span>
              <span className="nav-tab-text">
                <span className="nav-tab-title">Lead Finder</span>
                <span className="nav-tab-desc">Discover buying-intent posts</span>
              </span>
            </button>
            <button className="nav-tab" data-tab="filter">
              <span className="nav-tab-icon">✨</span>
              <span className="nav-tab-text">
                <span className="nav-tab-title">AI Filter</span>
                <span className="nav-tab-desc">Score raw leads</span>
              </span>
            </button>
          </div>

          {/* TAB: COMMENT STUDIO */}
          <div id="tab-studio" className="tab-content active">
            <section className="step-card">
              <div className="sc-header">
                <div className="sc-step-num">1</div>
                <div>
                  <h3 className="sc-title">Platform & Target URL</h3>
                  <p className="sc-desc">Paste the link to the post you want to engage with.</p>
                </div>
              </div>
              <div className="sc-body">
                <div className="platform-radios">
                  <label className="platform-label">
                    <input type="radio" name="platform" value="reddit" defaultChecked />
                    <span className="platform-btn"><span className="platform-icon">🔴</span> Reddit</span>
                  </label>
                  <label className="platform-label">
                    <input type="radio" name="platform" value="quora" />
                    <span className="platform-btn"><span className="platform-icon">🔴</span> Quora</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <input type="text" id="urlInput" className="sc-input" placeholder="e.g., https://www.reddit.com/r/..." />
                  <button id="fetchBtn" className="btn-primary" style={{ whiteSpace: "nowrap" }}>Load Post</button>
                </div>
                <div id="loadingIndicator" className="loading-ind" style={{ display: "none" }}>Loading post context...</div>
                <div id="errorMessage" className="error-msg" style={{ display: "none" }}></div>
                
                <div id="irrelevantBanner" className="msg-warn" style={{ display: "none", marginTop: "12px" }}>
                  <strong>Note:</strong> This post has been marked as irrelevant.
                </div>
              </div>
            </section>

            <section className="step-card" id="contextSection" style={{ opacity: 0.5 }}>
              <div className="sc-header">
                <div className="sc-step-num">2</div>
                <div>
                  <h3 className="sc-title">Post Context & Guidance</h3>
                  <p className="sc-desc">Adjust how the AI approaches this comment.</p>
                </div>
              </div>
              <div className="sc-body">
                <textarea id="contextInput" className="sc-textarea" rows={4} placeholder="Briefly summarize what the OP is asking..."></textarea>
                <div className="grid-2" style={{ marginTop: "16px" }}>
                  <div>
                    <label className="sc-label">Primary Topic</label>
                    <select id="topicInput" className="sc-select"></select>
                  </div>
                  <div>
                    <label className="sc-label">Persuasion Angle</label>
                    <select id="angleInput" className="sc-select"></select>
                  </div>
                </div>
              </div>
            </section>

            <section className="step-card" id="studioSection" style={{ opacity: 0.5 }}>
              <div className="sc-header" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div className="sc-step-num">3</div>
                  <div>
                    <h3 className="sc-title">Generation Studio</h3>
                    <p className="sc-desc">Select the best variant and finalize.</p>
                  </div>
                </div>
                <button id="generateBtn" className="btn-primary" disabled>Generate variants</button>
              </div>
              <div className="sc-body">
                <div className="studio-container">
                  <div className="studio-tabs" id="variantTabs"></div>
                  <div className="studio-workspace">
                    <textarea id="commentEditor" className="sc-textarea" rows={6} placeholder="Final comment will appear here..."></textarea>
                    
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }} id="smartTemplates"></div>
                    
                    <div className="studio-actions" style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <label className="sc-label">Tracking Status</label>
                        <select id="statusInput" className="sc-select">
                          <option value="Drafted">Drafted</option>
                          <option value="Needs review">Needs review</option>
                          <option value="Posted">Posted</option>
                          <option value="Skipped">Skipped</option>
                        </select>
                      </div>
                      <button id="saveBtn" className="btn-primary" style={{ padding: "0 24px", height: "42px" }}>Save & Track</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* TAB: LEAD FINDER */}
          <div id="tab-leads" className="tab-content">
            <section className="step-card">
              <div className="sc-header" style={{ justifyContent: "space-between" }}>
                <div>
                  <h3 className="sc-title">Reddit Lead Finder</h3>
                  <p className="sc-desc">Find recent posts mentioning specific keywords.</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button id="searchA37Btn" className="hdr-btn">Find A37 Mentions</button>
                  <button id="searchS26Btn" className="hdr-btn">Find S26 Mentions</button>
                  <button id="priorityDashBtn" className="hdr-btn" style={{ background: "var(--indigo)", color: "white", borderColor: "var(--indigo)" }}>â˜… Priority Dashboard</button>
                </div>
              </div>
              <div className="sc-body">
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input type="text" id="leadSearchInput" className="sc-input" placeholder='e.g., "samsung a37" OR "galaxy a57"' />
                  <button id="leadSearchBtn" className="btn-primary" style={{ whiteSpace: "nowrap" }}>Search Reddit</button>
                </div>
                <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="checkbox" id="intentFilterCheckbox" defaultChecked />
                  <label htmlFor="intentFilterCheckbox" className="sc-label" style={{ marginBottom: 0, cursor: "pointer" }}>
                    Append high-intent keywords (buy, upgrade, worth, switch)
                  </label>
                </div>
                <button id="copyToSheetsBtn" className="hdr-btn" style={{ marginTop: "16px", display: "none" }}>📋 Copy Grid for Google Sheets</button>
                <div id="leadLoading" className="loading-ind" style={{ display: "none", marginTop: "20px" }}>Searching Reddit across all communities...</div>
                <div id="leadError" className="error-msg" style={{ display: "none", marginTop: "20px" }}></div>
                <div id="leadResults" style={{ marginTop: "20px" }}></div>
              </div>
            </section>
          </div>

          {/* TAB: FILTER STUDIO */}
          <div id="tab-filter" className="tab-content">
            <section className="step-card">
              <div className="sc-header">
                <div className="sc-step-num">AI</div>
                <div>
                  <h3 className="sc-title">AI Filter Studio</h3>
                  <p className="sc-desc">Paste raw CSV leads. AI will evaluate and output golden leads.</p>
                </div>
              </div>
              <div className="sc-body">
                <textarea id="filterInput" className="sc-textarea" rows={6} placeholder="Paste CSV rows here (must include Title and URL)..."></textarea>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <button id="startFilterBtn" className="btn-primary">Evaluate Leads</button>
                  <button id="exportFilteredBtn" className="hdr-btn">Export Accepted Leads</button>
                </div>
              </div>
            </section>
            
            <section className="step-card" id="filterProgressCard" style={{ display: "none" }}>
              <div className="sc-body">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span id="filterProgressText" style={{ fontSize: "0.9em", color: "var(--text-2)" }}>0 / 0 Processed</span>
                  <span id="filterCurrentPost" style={{ fontSize: "0.85em", color: "var(--indigo)", fontWeight: 500, maxWidth: "60%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>...</span>
                  <span id="filterAcceptedText" style={{ fontSize: "0.9em", color: "var(--green)", fontWeight: "bold" }}>0 Accepted</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                  <div id="filterProgressBar" style={{ width: "0%", height: "100%", background: "linear-gradient(90deg, var(--indigo), var(--purple))", transition: "width 0.3s" }}></div>
                </div>
              </div>
            </section>

            <section className="step-card" id="filterResultsCard" style={{ display: "none" }}>
              <div className="sc-header"><h3 className="sc-title">Accepted Golden Leads</h3></div>
              <div className="sc-body" id="filterResultsArea"></div>
            </section>
          </div>
        </main>
      </div>

      <div id="toast" className="toast"></div>

      <script defer src="/app.js"></script>
    </>
  );
}
