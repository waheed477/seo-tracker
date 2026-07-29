/**
 * GSC Daily Sync Cron Job
 *
 * Runs once daily (6:00 AM UTC) and re-syncs Search Analytics data for
 * every site with gscConnected = true. Staggers processing with small
 * delays between sites to avoid hitting Google's API rate limits all
 * at once.
 *
 * This is an in-process cron job — no Redis or external queue needed.
 */

const cron = require('node-cron');
const Site = require('../models/Site');
const RankSnapshot = require('../models/RankSnapshot');
const gscService = require('../services/gscService');
const { createNotification } = require('../lib/notify');

const SYNC_DELAY_MS = 2_000; // 2 seconds between each site
const SYNC_DAYS = 30; // pull 30 days of data per sync

async function syncSite(site) {
  try {
    const rows = await gscService.fetchSearchAnalytics(site, SYNC_DAYS);

    if (rows.length === 0) {
      console.log(`[GSCSync] ${site.domain} — 0 rows returned (data may be delayed)`);
      return;
    }

    // Upsert each row as a RankSnapshot
    for (const row of rows) {
      await RankSnapshot.findOneAndUpdate(
        {
          siteId: site._id,
          queryText: row.queryText,
          page: row.page,
          date: row.date,
        },
        {
          siteId: site._id,
          queryText: row.queryText,
          page: row.page,
          avgPosition: row.avgPosition,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          date: row.date,
        },
        { upsert: true, new: false, setDefaultsOnInsert: true },
      );
    }

    console.log(`[GSCSync] ${site.domain} — ${rows.length} rows synced`);
  } catch (err) {
    console.error(`[GSCSync] ${site.domain} — error: ${err.message}`);

    // ── Notification: gsc_sync_error ────────────────────────────────────
    await createNotification(
      site.workspaceId.toString(),
      'gsc_sync_error',
      `Google Search Console sync failed for ${site.domain}: ${err.message}`,
      site._id.toString(),
    );
  }
}

function startGscDailySyncJob() {
  // Run daily at 6:00 AM UTC
  cron.schedule('0 6 * * *', async () => {
    try {
      const sites = await Site.find({ gscConnected: true });
      if (sites.length === 0) {
        console.log('[GSCSync] No GSC-connected sites — skipping daily sync');
        return;
      }

      console.log(`[GSCSync] Starting daily sync for ${sites.length} sites`);

      for (const site of sites) {
        await syncSite(site);
        await new Promise((r) => setTimeout(r, SYNC_DELAY_MS)); // stagger
      }

      console.log('[GSCSync] Daily sync complete');
    } catch (err) {
      console.error('[GSCSync] Cron error:', err.message);
    }
  });

  console.log('[GSCSync] Daily sync cron started (6:00 AM UTC, staggered with 2s delays)');
}

module.exports = { startGscDailySyncJob };
