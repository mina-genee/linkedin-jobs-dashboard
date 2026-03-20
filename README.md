# LinkedIn Jobs Dashboard 🚀

A modern, high-performance web dashboard that dynamically scrapes LinkedIn for job postings in real-time. Built with Next.js and Cheerio, it synthesizes unformatted job descriptions into highly readable, data-rich analytical views.

## Features
- **Dynamic Scraping:** Real-time data extraction via Next.js server-side API routes pulling directly from LinkedIn search.
- **Smart Data Parsing:** Aggressively extracts hidden salary/compensation bands and automatically generates "TLDR" job summaries.
- **Dual Display Modes:** View jobs in a responsive "Split View" with sliding floating modals, or a highly scannable "Spreadsheet View".
- **Mobile Optimized:** 100% responsive layout that transforms wide data tables into stacked cards on mobile devices for perfect UX.

## How to Run Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/en) installed on your machine.

### Installation
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/mina-genee/linkedin-jobs-dashboard.git
   ```
2. Navigate into the project directory:
   ```bash
   cd linkedin-jobs-dashboard
   ```
3. Install all the necessary dependencies:
   ```bash
   npm install
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser to start searching for jobs!
