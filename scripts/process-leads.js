#!/usr/bin/env node

/**
 * Today's Stash — Lead Processor
 * Converts Apify Google Maps Scraper JSON output to a clean call sheet CSV.
 * 
 * Usage: node scripts/process-leads.js <input.json> [output.csv]
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3] || 'call-sheet.csv';

if (!inputFile) {
  console.error('❌ Usage: node process-leads.js <input.json> [output.csv]');
  process.exit(1);
}

// Categories to EXCLUDE (contractors, trades, etc.)
const EXCLUDED_CATEGORIES = [
  'contractor', 'builder', 'plumber', 'electrician', 'carpenter',
  'roofing', 'landscaper', 'painter', 'tiler', 'concreter',
  'fencing', 'excavation', 'demolition', 'scaffolding',
  'real estate', 'lawyer', 'solicitor', 'accountant',
  'insurance', 'mortgage', 'financial', 'bank',
  'school', 'church', 'council', 'government',
  'hospital', 'funeral', 'cemetery', 'storage',
  'moving', 'removalist', 'warehouse'
];

function isExcluded(place) {
  const cats = (place.categories || []).map(c => c.toLowerCase());
  const category = (place.categoryName || '').toLowerCase();
  const title = (place.title || '').toLowerCase();
  
  return EXCLUDED_CATEGORIES.some(excluded => 
    cats.some(c => c.includes(excluded)) || 
    category.includes(excluded) ||
    title.includes(excluded)
  );
}

function escapeCSV(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Load and process
const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const places = Array.isArray(raw) ? raw : [raw];

console.log(`📦 Loaded ${places.length} places from ${inputFile}`);

// Filter: must have phone, not excluded, not closed
const leads = places
  .filter(p => p.phone || p.phoneUnformatted)
  .filter(p => !p.permanentlyClosed && !p.temporarilyClosed)
  .filter(p => !isExcluded(p));

// Deduplicate by phone number
const seen = new Set();
const unique = leads.filter(p => {
  const phone = (p.phoneUnformatted || p.phone || '').replace(/\D/g, '');
  if (seen.has(phone)) return false;
  seen.add(phone);
  return true;
});

console.log(`✅ ${unique.length} valid leads (after filtering & dedup)`);
console.log(`🚫 ${places.length - unique.length} removed (no phone / closed / excluded / duplicate)`);

// Sort alphabetically
unique.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

// Build CSV
const header = 'Business Name,Phone Number,Category,Address,Suburb,Rating,Reviews';
const rows = unique.map(p => [
  escapeCSV(p.title),
  escapeCSV(p.phone || p.phoneUnformatted),
  escapeCSV(p.categoryName || (p.categories || [])[0] || ''),
  escapeCSV(p.address),
  escapeCSV(p.neighborhood || p.city || ''),
  p.totalScore || '',
  p.reviewsCount || ''
].join(','));

const csv = [header, ...rows].join('\n');
fs.writeFileSync(outputFile, csv, 'utf-8');

console.log(`\n📄 Call sheet saved to: ${outputFile}`);
console.log(`\n--- Summary by Category ---`);

// Category breakdown
const catCount = {};
unique.forEach(p => {
  const cat = p.categoryName || (p.categories || [])[0] || 'Unknown';
  catCount[cat] = (catCount[cat] || 0) + 1;
});

Object.entries(catCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([cat, count]) => console.log(`  ${count.toString().padStart(4)} × ${cat}`));
