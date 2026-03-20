import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export interface JobData {
  title: string;
  company: string;
  location: string;
  job_link: string;
  posted_date: string;
}

const BASE_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords') || 'AI/ML Engineer';
  const location = searchParams.get('location') || 'London';
  const maxJobsUrl = searchParams.get('maxJobs') || '25';
  
  const maxJobs = parseInt(maxJobsUrl, 10);
  let allJobs: JobData[] = [];
  let start = 0;
  const JOBS_PER_PAGE = 25;

  try {
    while (allJobs.length < maxJobs) {
      const url = `${BASE_URL}?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=${start}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 429) {
            throw new Error(`Rate limited by LinkedIn (429). Search returned ${allJobs.length} results so far.`);
        }
        throw new Error(`Failed to fetch data: Status code ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const jobCards = $('div.base-card');

      if (jobCards.length === 0) break;

      jobCards.each((_, element) => {
        if (allJobs.length >= maxJobs) return false; // break cheerio each loop

        const title = $(element).find('h3.base-search-card__title').text().trim();
        const company = $(element).find('h4.base-search-card__subtitle').text().trim();
        const loc = $(element).find('span.job-search-card__location').text().trim();
        let job_link = $(element).find('a.base-card__full-link').attr('href') || '';
        job_link = job_link.split('?')[0];
        
        let posted_date = $(element).find('time.job-search-card__listdate').text().trim() || 
                          $(element).find('time.job-search-card__listdate--new').text().trim() || 'N/A';

        if (title && company) {
          allJobs.push({ title, company, location: loc, job_link, posted_date });
        }
      });

      start += JOBS_PER_PAGE;
      if (allJobs.length < maxJobs && jobCards.length > 0) {
        // Delay to prevent extreme rate limiting during large sweeps
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return NextResponse.json({ success: true, count: allJobs.length, data: allJobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, data: allJobs }, { status: 500 });
  }
}
