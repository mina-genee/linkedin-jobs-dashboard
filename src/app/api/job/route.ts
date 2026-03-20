import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobUrl = searchParams.get('url');

  if (!jobUrl) {
    return NextResponse.json({ success: false, error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(jobUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job details: Status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get the main job description rich text
    let descriptionHtml = $('.show-more-less-html__markup').html() || 
                            $('.description__text--rich').html() || 
                            $('.description__text').html() || '';
                            
    // Clean up tracking pixels and empty tags
    descriptionHtml = descriptionHtml.replace(/<img[^>]*>/g, '');

    // Extract criteria (Seniority, Employment type, etc.)
    const criteria: Record<string, string> = {};
    $('.description__job-criteria-item').each((_, el) => {
      const header = $(el).find('.description__job-criteria-subheader').text().trim();
      const text = $(el).find('.description__job-criteria-text').text().trim();
      if (header && text) {
        criteria[header] = text;
      }
    });

    // Attempt to extract compensation directly from the HTML if it exists natively in a class
    let compensationText = $('.salary-compensation').text().trim();
    if (!compensationText) {
      compensationText = $('.compensation__code-and-amount').text().trim(); 
    }
    
    // Check criteria for salary just in case
    if (!compensationText) {
       for (const [key, val] of Object.entries(criteria)) {
          if (key.toLowerCase().includes('salary') || key.toLowerCase().includes('pay')) {
              compensationText = val;
              break;
          }
       }
    }

    // Fallback: Aggressive Regex Search on the raw text for £, $, or € amounts
    if (!compensationText && descriptionHtml) {
      const cleanTextForMoney = descriptionHtml.replace(/<[^>]+>/g, ' ');
      // Regex detects forms like £50k, $100,000 - $120,000, 50,000 USD/yr, €80k, etc.
      const moneyRegex = /(?:£|\$|€)\s*\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*[kK])?(?:\s*(?:-|to|and)\s*(?:£|\$|€)?\s*\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*[kK])?)?(?:\s*\/?\s*(?:yr|year|month|mo|hr|hour|annum|p\.a\.|per annum|per year))?/i;
      const match = cleanTextForMoney.match(moneyRegex);
      if (match) {
        compensationText = match[0].trim();
      }
    }

    // Generate TLDR
    let tldr = "";
    if (descriptionHtml) {
      const cleanJobText = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      tldr = cleanJobText;
      if (cleanJobText.length > 250) {
        const cutoff = cleanJobText.substring(0, 250);
        const lastPeriod = cutoff.lastIndexOf('.');
        tldr = (lastPeriod > 50) ? cutoff.substring(0, lastPeriod + 1) : cutoff.trim() + '...';
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        descriptionHtml: descriptionHtml.trim() ? descriptionHtml : null,
        tldr: tldr || null,
        criteria,
        compensation: compensationText || null
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
