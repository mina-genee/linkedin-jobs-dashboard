'use client';

import { useState, useEffect, useRef } from 'react';

interface JobData {
  title: string;
  company: string;
  location: string;
  job_link: string;
  posted_date: string;
}

interface JobDetail {
  descriptionHtml?: string;
  tldr?: string;
  criteria?: Record<string, string>;
  compensation?: string;
  error?: string;
}

const PRESET_KEYWORDS = [
  "AI/ML Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Product Manager",
  "Data Scientist",
  "DevOps Engineer",
  "Designer"
];

const PRESET_LOCATIONS = [
  "London",
  "New York",
  "Remote",
  "San Francisco",
  "Seattle",
  "Toronto",
  "Berlin"
];

export default function Dashboard() {
  const [keywords, setKeywords] = useState("AI/ML Engineer");
  const [location, setLocation] = useState("London");
  const [maxJobs, setMaxJobs] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [viewMode, setViewMode] = useState<'split' | 'spreadsheet'>('split');
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [jobDetails, setJobDetails] = useState<JobDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [detailsCache, setDetailsCache] = useState<Record<string, JobDetail>>({});
  const fetchedHrefs = useRef<Set<string>>(new Set());
  
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  
  const toggleSummary = (link: string) => {
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      if (next.has(link)) next.delete(link);
      else next.add(link);
      return next;
    });
  };

  // Background Auto-Fetcher for Spreadsheet View
  useEffect(() => {
    let active = true;

    const fetchQueue = async () => {
      // Only run auto-fetch loosely if in spreadsheet view and jobs exist
      if (viewMode !== 'spreadsheet' || jobs.length === 0) return;

      for (const job of jobs) {
        if (!active) break;
        if (fetchedHrefs.current.has(job.job_link)) continue;

        fetchedHrefs.current.add(job.job_link);

        try {
          const res = await fetch(`/api/job?url=${encodeURIComponent(job.job_link)}`);
          const data = await res.json();
          if (active && data.success) {
            setDetailsCache(prev => ({ ...prev, [job.job_link]: data.data }));
          } else if (active && !data.success) {
            setDetailsCache(prev => ({ ...prev, [job.job_link]: { error: data.error } }));
          }
        } catch (err: any) {
          if (active) setDetailsCache(prev => ({ ...prev, [job.job_link]: { error: 'Network Error' } }));
        }

        // Delay to prevent 429
        if (active) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    };

    fetchQueue();
    return () => { active = false; };
  }, [jobs, viewMode]);

  const fetchJobDetails = async (job: JobData) => {
    if (selectedJob?.job_link === job.job_link) return;

    setSelectedJob(job);
    setJobDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const res = await fetch(`/api/job?url=${encodeURIComponent(job.job_link)}`);
      const data = await res.json();
      if (data.success) {
        setJobDetails(data.data);
      } else {
        setDetailsError(data.error || "Failed to fetch job details.");
      }
    } catch (err: any) {
      setDetailsError(err.message || "Network error fetching details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setJobs([]);
    setSelectedJob(null);
    setDetailsCache({});
    fetchedHrefs.current.clear();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const res = await fetch(`/api/scrape?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&maxJobs=${maxJobs}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      
      if (!data.success && !data.data) {
         setError(data.error || "Failed to fetch jobs");
      } else {
         const fetchedJobs = data.data || [];
         setJobs(fetchedJobs);
         if (!data.success && data.error) {
             setError(`Partial results loaded. ${data.error}`);
         }
         
         // Auto-collapse search to maximize screen space for results
         setIsSearchExpanded(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
         setError("Search timed out. LinkedIn might be rate-limiting heavily.");
      } else {
         setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };



  return (
    <main>
      <header>
        <h1>LinkedIn Jobs Dashboard</h1>
        <p className="subtitle">Real-time dynamic scraping via CheerIO & Next.js API Routes</p>
      </header>

      <div className="glass-panel">
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isSearchExpanded ? '1.5rem' : '0' }}
          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
        >
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>
            <svg style={{display:'inline', marginRight:'0.5rem', verticalAlign:'sub'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search Parameters
          </h2>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{isSearchExpanded ? '▲' : '▼'}</span>
        </div>

        {isSearchExpanded && (
          <form className="search-form" onSubmit={handleSearch}>
          <div className="input-group">
            <label>Keywords</label>
            <select 
              value={keywords} 
              onChange={(e) => setKeywords(e.target.value)} 
              className="form-select"
              required
            >
              <option value="" disabled>Select Keywords</option>
              {PRESET_KEYWORDS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Location</label>
            <select 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              className="form-select"
              required
            >
              <option value="" disabled>Select Location</option>
              {PRESET_LOCATIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ flex: '0.4' }}>
            <label>Max Jobs</label>
            <input 
              type="number" 
              value={maxJobs} 
              min="10"
              max="100"
              onChange={(e) => setMaxJobs(Number(e.target.value))} 
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "Scrape Jobs"}
          </button>
        </form>
        )}
      </div>

      {error  && <div className="error-message">{error}</div>}

      {!loading && hasSearched && jobs.length === 0 && !error && (
        <div className="empty-state">
          <h2>No jobs found</h2>
          <p>Try adjusting your search keywords or location.</p>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="view-toggles">
          <button className={viewMode === 'split' ? 'active' : ''} onClick={() => {
            setViewMode('split');
            if (jobs.length > 0 && !selectedJob) fetchJobDetails(jobs[0]);
          }}>
            Split View
          </button>
          <button className={viewMode === 'spreadsheet' ? 'active' : ''} onClick={() => setViewMode('spreadsheet')}>
            Spreadsheet View
          </button>
        </div>
      )}

      {jobs.length > 0 && viewMode === 'split' && (
        <div className={`results-container ${selectedJob ? 'split-view' : ''}`}>
          <div className={selectedJob ? "job-list" : "job-grid"}>
            {jobs.map((job, index) => (
              <div 
                key={index} 
                className={`job-card ${selectedJob?.job_link === job.job_link ? 'active' : ''}`}
                onClick={() => fetchJobDetails(job)}
              >
                <h3 className="job-title">{job.title}</h3>
                <div className="job-company">{job.company}</div>
                
                <div className="job-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {job.location}
                </div>
                
                <div className="job-footer">
                  <span style={{color: 'var(--text-muted)'}}>View Details &rarr;</span>
                  <span className="job-date">{job.posted_date}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedJob && (
            <>
              <div className="mobile-overlay" onClick={() => setSelectedJob(null)}></div>
              <div className="job-detail-pane glass-panel">
                <button 
                  className="close-btn" 
                  onClick={() => setSelectedJob(null)}
                  aria-label="Close details"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                
                <h2>{selectedJob.title}</h2>
              <div className="detail-company">{selectedJob.company} &bull; {selectedJob.location}</div>
              <a href={selectedJob.job_link} target="_blank" rel="noopener noreferrer" className="apply-btn">Apply via LinkedIn ↗</a>
              
              <div className="detail-content">
                {detailsLoading && (
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-muted)'}}>
                    <div className="spinner" style={{width: '32px', height: '32px', borderTopColor: 'var(--primary)', borderWidth: '3px'}}></div>
                    <p>Loading details...</p>
                  </div>
                )}
                
                {detailsError && <div className="error-message">{detailsError}</div>}
                
                {jobDetails && !detailsLoading && (
                  <>
                    {jobDetails.compensation && (
                      <div className="compensation-badge">
                        💰 {jobDetails.compensation}
                      </div>
                    )}
                    
                    {jobDetails.criteria && Object.keys(jobDetails.criteria).length > 0 && (
                      <div className="job-criteria">
                        {Object.entries(jobDetails.criteria).map(([key, value]) => (
                          <div key={key} className="criterion">
                            <strong>{key}</strong>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="job-description" dangerouslySetInnerHTML={{ __html: jobDetails.descriptionHtml || '<p>No description available.</p>' }} />
                  </>
                )}
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {jobs.length > 0 && viewMode === 'spreadsheet' && (
        <div className="table-container fade-in">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Title</th>
                <th>Location</th>
                <th>Salary/Comp</th>
                <th>Summary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const detail = detailsCache[job.job_link];
                const isExpanded = expandedSummaries.has(job.job_link);
                let snippet: React.ReactNode = <div className="table-spinner" title="Loading deep data..." />;
                if (detail) {
                  if (detail.error) {
                    snippet = <span style={{color:'#b91c1c'}}>Failed to fetch ({detail.error})</span>;
                  } else if (detail.descriptionHtml) {
                    if (isExpanded) {
                      snippet = (
                        <div>
                          <div className="table-full-summary" dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }} />
                          <button onClick={() => toggleSummary(job.job_link)} style={{background:'transparent', border:'none', color:'var(--primary)', fontWeight: 600, cursor:'pointer', marginTop:'0.5rem', fontSize:'0.85rem'}}>
                            Show Less &uarr;
                          </button>
                        </div>
                      );
                    } else {
                      snippet = (
                        <div>
                          <p style={{marginBottom: '0.4rem', color: '#4b5563', lineHeight: 1.5}}>{detail.tldr || "No short summary available."}</p>
                          <button onClick={() => toggleSummary(job.job_link)} style={{background:'transparent', border:'none', color:'var(--primary)', fontWeight: 600, cursor:'pointer', fontSize:'0.85rem'}}>
                            Read Full Description &darr;
                          </button>
                        </div>
                      );
                    }
                  } else {
                    snippet = <span>No summary available.</span>
                  }
                }

                const comp = detail ? (detail.compensation || 'N/A') : <div className="table-spinner" />;

                return (
                  <tr key={job.job_link}>
                    <td data-label="Company" style={{fontWeight: 500}}>{job.company}</td>
                    <td data-label="Title" className="table-title">{job.title}</td>
                    <td data-label="Location">{job.location}</td>
                    <td data-label="Salary/Comp" style={{color: 'var(--accent)', fontWeight: 600}}>{comp}</td>
                    <td data-label="Summary" className="table-summary">{snippet}</td>
                    <td data-label="Action">
                      <a href={job.job_link} target="_blank" rel="noopener noreferrer" className="table-link">Apply ↗</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
