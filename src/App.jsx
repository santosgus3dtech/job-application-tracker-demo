import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  Clock3,
  Columns3,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  Menu,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Wifi,
  X,
} from "lucide-react";

const columns = [
  { key: "company", label: "Company", width: 205 },
  { key: "title", label: "Role", width: 250 },
  { key: "country", label: "Country", width: 112 },
  { key: "city", label: "City", width: 165 },
  { key: "work_mode", label: "Work mode", width: 128 },
  { key: "compatibility", label: "Compatibility %", width: 142 },
  { key: "difficulty", label: "Difficulty", width: 118 },
  { key: "status", label: "Status", width: 138 },
  { key: "resume_version", label: "Resume version", width: 155 },
  { key: "applied_at", label: "Applied", width: 116 },
  { key: "url", label: "Link", width: 66 },
  { key: "notes", label: "Notes", width: 280 },
];

const initialVisible = columns.map((column) => column.key);
const blankFilters = { search: "", country: "", status: "", work_mode: "", difficulty: "", min_compatibility: 0 };
const pageSizes = [15, 25, 50];
const statusOptions = ["Queue", "Reviewing", "CV tailored", "Applied", "Interview", "Rejected"];
const difficultyOptions = ["Easy", "Medium", "Complex"];
const apiUrl = (path) => `${import.meta.env.BASE_URL}api/${path}`;

const statusTone = (value) => {
  if (["Applied", "Interview"].includes(value)) return "sent";
  if (value === "Reviewing") return "pending";
  if (value === "Rejected") return "discarded";
  if (["Queue", "CV tailored"].includes(value)) return "progress";
  return "neutral";
};

const difficultyTone = (value) => {
  if (value === "Easy") return "easy";
  if (value === "Medium") return "medium";
  if (value === "Complex") return "hard";
  return "unknown";
};

const displayDifficulty = (value) => value || "Not assessed";
const countryFlag = (country) => ({ Brazil: "BR", Portugal: "PT", Canada: "CA" }[country] || "");

const parseStoredDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  let normalized = text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) normalized = `${text}T12:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(text)) normalized = `${text.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatStoredDate = (value, options) => {
  const date = parseStoredDate(value);
  return date ? new Intl.DateTimeFormat("en-CA", options).format(date) : "-";
};

function useClickOutside(ref, close) {
  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, close]);
}

function IconButton({ label, children, className = "", ...props }) {
  return <button className={`icon-button ${className}`} title={label} aria-label={label} {...props}>{children}</button>;
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="stat">
      <Icon size={25} strokeWidth={1.7} className={`tone-${tone}`} aria-hidden="true" />
      <div><strong>{value ?? 0}</strong><span>{label}</span></div>
    </div>
  );
}

function SelectField({ label, value, options, onChange, hideLabel = false }) {
  return (
    <label className={`field ${hideLabel ? "field-label-hidden" : ""}`}>
      {hideLabel ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      <div className="select-wrap">
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">All</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </label>
  );
}

function FilterGroup({ label, filterKey, value, options, counts, onChange }) {
  return (
    <section className="filter-group">
      <h3>{label}</h3>
      <SelectField label={label} hideLabel value={value} options={options} onChange={onChange} />
      <div className="quick-options">
        {options.map((option) => {
          const checked = value === option;
          const tone = filterKey === "status" ? statusTone(option) : filterKey === "difficulty" ? difficultyTone(option) : "plain";
          return (
            <label key={option}>
              <input type="checkbox" checked={checked} onChange={() => onChange(checked ? "" : option)} />
              <span className="filter-check"><Check size={11} /></span>
              {filterKey === "country" ? <span className="flag" aria-hidden="true">{countryFlag(option)}</span> : <i className={`filter-dot dot-${tone}`} />}
              <span>{filterKey === "difficulty" ? displayDifficulty(option) : option}</span>
              <b>{counts[option] || 0}</b>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ value }) {
  return <span className={`badge badge-${statusTone(value)}`}>{value}</span>;
}

function Difficulty({ value }) {
  return <span className="difficulty"><i className={difficultyTone(value)} />{displayDifficulty(value)}</span>;
}

function WorkMode({ value }) {
  const Icon = value === "Remote" ? Wifi : Building2;
  return <span className="with-icon"><Icon size={15} strokeWidth={1.8} />{value || "-"}</span>;
}

function Cell({ column, job }) {
  const value = job[column.key];
  if (column.key === "company") return <span className="company"><Building2 size={15} strokeWidth={1.7} />{value}</span>;
  if (column.key === "country") return <span className="country"><span aria-hidden="true">{countryFlag(value)}</span>{value}</span>;
  if (column.key === "work_mode") return <WorkMode value={value} />;
  if (column.key === "compatibility") return <span className={`score ${value >= 80 ? "high" : value >= 65 ? "good" : value < 50 ? "low" : ""}`}>{value}%</span>;
  if (column.key === "difficulty") return <Difficulty value={value} />;
  if (column.key === "status") return <StatusBadge value={value} />;
  if (column.key === "url") return <a className="icon-link" href={value} target="_blank" rel="noreferrer" title="Open role"><ExternalLink size={15} /></a>;
  if (column.key === "resume_version") return <span className="document-cell"><FileText size={14} />{value || "-"}</span>;
  if (column.key === "applied_at") return formatStoredDate(value);
  return value || "-";
}

function ColumnChooser({ visible, setVisible, onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  const toggle = (key) => {
    setVisible((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };
  return (
    <div className="column-popover" ref={ref}>
      <div className="popover-title"><strong>Choose columns</strong><IconButton label="Close" onClick={onClose}><X size={16} /></IconButton></div>
      <div className="column-options">
        {columns.map((column) => (
          <label key={column.key}>
            <input type="checkbox" checked={visible.includes(column.key)} onChange={() => toggle(column.key)} />
            <span className="custom-check"><Check size={12} /></span>
            <span>{column.label}</span>
          </label>
        ))}
      </div>
      <button className="reset-columns" onClick={() => setVisible(initialVisible)}>Reset to default</button>
    </div>
  );
}

function DetailDrawer({ job, onClose, onSaved }) {
  const [status, setStatus] = useState(job.status);
  const [difficulty, setDifficulty] = useState(job.difficulty);
  const [notes, setNotes] = useState(job.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const response = await fetch(apiUrl(`jobs/${job.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, difficulty, notes }),
    });
    const updated = await response.json();
    setSaving(false);
    if (response.ok) onSaved(updated);
  };

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" aria-label="Role details">
        <header>
          <div><span>{job.company}</span><h2>{job.title}</h2></div>
          <IconButton label="Close" onClick={onClose}><X size={19} /></IconButton>
        </header>
        <div className="drawer-score"><strong>{job.compatibility}%</strong><span>compatibility</span></div>
        <dl>
          <div><dt>Location</dt><dd>{job.location}</dd></div>
          <div><dt>Market</dt><dd>{job.account_profile || job.country}</dd></div>
          <div><dt>Resume</dt><dd>{job.resume_version || "-"}</dd></div>
          <div><dt>Fit rationale</dt><dd>{job.fit_reason || "-"}</dd></div>
          <div><dt>Suggested adjustment</dt><dd>{job.cv_adjustment || "-"}</dd></div>
        </dl>
        <div className="drawer-fields">
          <SelectField label="Status" value={status} options={statusOptions} onChange={setStatus} />
          <SelectField label="Difficulty" value={difficulty} options={difficultyOptions} onChange={setDifficulty} />
          <label className="field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="6" /></label>
        </div>
        <footer>
          <a className="secondary-button" href={job.url} target="_blank" rel="noreferrer">Open role <ArrowUpRight size={16} /></a>
          <button className="primary-button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Save</button>
        </footer>
      </aside>
    </div>
  );
}

function Pager({ page, totalPages, pageSize, setPage, setPageSize }) {
  const pageItems = useMemo(() => {
    const start = Math.max(1, Math.min(page - 1, totalPages - 3));
    return Array.from({ length: Math.min(4, totalPages) }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <div className="pager">
      <label>Rows per page:<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{pageSizes.map((size) => <option key={size}>{size}</option>)}</select></label>
      <nav aria-label="Paginação">
        <IconButton label="First page" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft size={15} /></IconButton>
        <IconButton label="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}><ChevronLeft size={15} /></IconButton>
        {pageItems.map((item) => <button key={item} className={`page-button ${item === page ? "active" : ""}`} onClick={() => setPage(item)}>{item}</button>)}
        <IconButton label="Next page" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}><ChevronRight size={15} /></IconButton>
        <IconButton label="Last page" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={15} /></IconButton>
      </nav>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [meta, setMeta] = useState({ summary: {}, options: {} });
  const [filters, setFilters] = useState(blankFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia("(max-width: 900px)").matches);
  const searchRef = useRef(null);
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem("candidaturas-visible-columns")) || initialVisible; }
    catch { return initialVisible; }
  });

  useEffect(() => localStorage.setItem("candidaturas-visible-columns", JSON.stringify(visible)), [visible]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [fetch(`${apiUrl("jobs")}?${query}`), fetch(apiUrl("meta"))];
      if (query) requests.push(fetch(apiUrl("jobs")));
      const [jobsResponse, metaResponse, catalogResponse] = await Promise.all(requests);
      if (!jobsResponse.ok || !metaResponse.ok || (catalogResponse && !catalogResponse.ok)) throw new Error("Could not load applications.");
      const jobsPayload = await jobsResponse.json();
      setJobs(jobsPayload);
      setMeta(await metaResponse.json());
      setCatalog(catalogResponse ? await catalogResponse.json() : jobsPayload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelectedIds([]); }, [query, pageSize]);

  const shownColumns = columns.filter((column) => visible.includes(column.key));
  const summary = meta.summary || {};
  const options = meta.options || {};
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const pagedJobs = jobs.slice((page - 1) * pageSize, page * pageSize);
  const firstRow = jobs.length ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, jobs.length);
  const allPageSelected = pagedJobs.length > 0 && pagedJobs.every((job) => selectedIds.includes(job.id));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const facetCounts = useMemo(() => {
    const result = { country: {}, status: {}, work_mode: {}, difficulty: {} };
    for (const job of catalog) {
      for (const key of Object.keys(result)) {
        const value = job[key];
        if (value) result[key][value] = (result[key][value] || 0) + 1;
      }
    }
    return result;
  }, [catalog]);

  const toggleSelected = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePage = () => {
    const pageIds = pagedJobs.map((job) => job.id);
    setSelectedIds((current) => allPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]);
  };

  const applyBulkStatus = async (status) => {
    if (!status || selectedIds.length === 0) return;
    setBulkSaving(true);
    const payload = { status };
    if (status === "Applied") payload.applied_at = new Date().toISOString().slice(0, 10);
    await Promise.all(selectedIds.map((id) => fetch(apiUrl(`jobs/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })));
    setSelectedIds([]);
    setBulkSaving(false);
    await load();
  };

  const discardSelected = async () => {
    if (selectedIds.length === 0 || !window.confirm(`Reject ${selectedIds.length} selected application(s)?`)) return;
    await applyBulkStatus("Rejected");
  };

  const exportCsv = () => {
    const rows = [shownColumns.map((column) => column.label), ...jobs.map((job) => shownColumns.map((column) => job[column.key] ?? ""))];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const focusSearch = () => {
    setSidebarOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 80);
  };

  return (
    <main className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <header className="topbar">
        <div className="topbar-primary">
          <IconButton label={sidebarOpen ? "Hide filters" : "Show filters"} className="menu-button" onClick={() => setSidebarOpen((current) => !current)}><Menu size={21} /></IconButton>
          <h1>Applications</h1>
          <span className="updated">Last update: {summary.updated_at ? formatStoredDate(summary.updated_at, { dateStyle: "short", timeStyle: "short" }) : "now"}</span>
          <IconButton label="Refresh" className="inline-refresh" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={17} /></IconButton>
        </div>
        <div className="topbar-actions">
          <IconButton label="Search applications" onClick={focusSearch}><Search size={20} /></IconButton>
          <button className="topbar-button" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh roles</button>
        </div>
      </header>

      <button className="sidebar-overlay" aria-label="Close filters" onClick={() => setSidebarOpen(false)} />
      <div className="workspace">
        <aside className="filters">
          <div className="section-heading"><h2>Filters</h2><button onClick={() => setFilters(blankFilters)} disabled={activeFilters === 0}>Clear all</button></div>
          <label className="field search-field"><span>Search</span><div className="search-wrap"><Search size={16} /><input ref={searchRef} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search company or role..." /></div></label>

          <FilterGroup label="Country" filterKey="country" value={filters.country} options={options.country || []} counts={facetCounts.country} onChange={(value) => setFilters({ ...filters, country: value })} />
          <FilterGroup label="Application status" filterKey="status" value={filters.status} options={options.status || []} counts={facetCounts.status} onChange={(value) => setFilters({ ...filters, status: value })} />
          <FilterGroup label="Work mode" filterKey="work_mode" value={filters.work_mode} options={options.work_mode || []} counts={facetCounts.work_mode} onChange={(value) => setFilters({ ...filters, work_mode: value })} />
          <FilterGroup label="Difficulty" filterKey="difficulty" value={filters.difficulty} options={options.difficulty || []} counts={facetCounts.difficulty} onChange={(value) => setFilters({ ...filters, difficulty: value })} />

          <label className="field range-field"><span>Minimum compatibility (%)</span><output>{filters.min_compatibility}%</output><input aria-label={`Minimum compatibility ${filters.min_compatibility}%`} type="range" min="0" max="100" step="5" value={filters.min_compatibility} onChange={(event) => setFilters({ ...filters, min_compatibility: Number(event.target.value) })} /><div><span>0%</span><span>50%</span><span>100%</span></div></label>
          <div className="market-progress">
            <h3>Application targets</h3>
            <div><span>Brazil</span><strong>{summary.sent_brazil || 0}/15</strong><progress max="15" value={summary.sent_brazil || 0} /></div>
            <div><span>Portugal</span><strong>{summary.sent_portugal || 0}/15</strong><progress max="15" value={summary.sent_portugal || 0} /></div>
          </div>
        </aside>

        <section className="content">
          <div className="stats-strip">
            <Stat icon={Send} label="Applied" value={summary.sent} tone="teal" />
            <Stat icon={Clock3} label="In progress" value={summary.in_progress} tone="blue" />
            <Stat icon={CircleAlert} label="Reviewing" value={summary.pending} tone="amber" />
            <Stat icon={Trash2} label="Rejected" value={summary.discarded} tone="red" />
            <div className="total-stat"><span>Total</span><strong>{summary.total || 0}</strong><small>Applications</small></div>
          </div>

          <div className="table-toolbar">
            <div className="selection-actions">
              <strong>{selectedIds.length} selected</strong>
              <label className="status-move"><span className="sr-only">Move applications</span><select aria-label="Move applications" disabled={selectedIds.length === 0 || bulkSaving} defaultValue="" onChange={(event) => { applyBulkStatus(event.target.value); event.target.value = ""; }}><option value="" disabled>Move to...</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={14} /></label>
              <button className="toolbar-action danger" onClick={discardSelected} disabled={selectedIds.length === 0 || bulkSaving}><Trash2 size={16} />Reject</button>
              <button className="toolbar-action" onClick={exportCsv} disabled={jobs.length === 0}><Download size={16} />Export</button>
            </div>
            <div className="table-actions">
              <div className="columns-anchor">
                <button className="secondary-button" onClick={() => setColumnsOpen(!columnsOpen)}><Columns3 size={16} />Columns</button>
                {columnsOpen && <ColumnChooser visible={visible} setVisible={setVisible} onClose={() => setColumnsOpen(false)} />}
              </div>
              <button className="toolbar-action refresh-action" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} />Refresh</button>
            </div>
          </div>

          <div className="table-wrap">
            {error ? <div className="empty error"><CircleAlert size={25} /><strong>Could not load the dashboard</strong><span>{error}</span><button className="secondary-button" onClick={load}>Try again</button></div> : loading ? <div className="loading"><LoaderCircle className="spin" size={23} /> Loading roles</div> : jobs.length === 0 ? (
              <div className="empty"><Search size={24} /><strong>No roles found</strong><span>Adjust or clear the filters.</span></div>
            ) : (
              <table>
                <colgroup><col className="selection-col" />{shownColumns.map((column) => <col key={column.key} className={`column-${column.key}`} style={{ width: column.width }} />)}</colgroup>
                <thead><tr><th className="select-cell"><input aria-label="Select page" type="checkbox" checked={allPageSelected} onChange={togglePage} /></th>{shownColumns.map((column) => <th key={column.key} className={`column-${column.key}`}>{column.label}</th>)}</tr></thead>
                <tbody>{pagedJobs.map((job) => {
                  const isSelected = selectedIds.includes(job.id);
                  return (
                    <tr key={job.id} className={isSelected ? "selected" : ""} onClick={(event) => !event.target.closest("a, button, input, select, label") && setSelectedJob(job)} tabIndex="0" onKeyDown={(event) => event.key === "Enter" && setSelectedJob(job)}>
                      <td className="select-cell"><input aria-label={`Select ${job.company} - ${job.title}`} type="checkbox" checked={isSelected} onChange={() => toggleSelected(job.id)} /></td>
                      {shownColumns.map((column) => <td key={column.key} className={`column-${column.key}`}><Cell column={column} job={job} /></td>)}
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
          </div>

          <footer className="table-footer">
            <span>Showing {firstRow} to {lastRow} of {jobs.length} applications</span>
            <Pager page={page} totalPages={totalPages} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
            <span className="storage-status"><CheckCircle2 size={14} />SQLite</span>
          </footer>
        </section>
      </div>
      {selectedJob && <DetailDrawer job={selectedJob} onClose={() => setSelectedJob(null)} onSaved={(updated) => { setSelectedJob(null); setJobs((current) => current.map((item) => item.id === updated.id ? updated : item)); load(); }} />}
    </main>
  );
}
