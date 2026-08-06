import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentApi, ContentReviewResult } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

// ── Readability badge ─────────────────────────────────────────────────────────
const READABILITY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50',
  Moderate: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50',
  Difficult: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContentReviewPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [content, setContent] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [result, setResult] = useState<ContentReviewResult | null>(null);

  async function handleReview() {
    if (!siteId) return;

    const kwList = targetKeywords
      .split(/[\n,]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);

    if (!content.trim() && kwList.length === 0) {
      setRunError('Provide content and at least one target keyword');
      return;
    }
    if (!content.trim()) {
      setRunError('Paste the content you want to analyze');
      return;
    }
    if (kwList.length === 0) {
      setRunError('Enter at least one target keyword');
      return;
    }

    setRunError('');
    setRunning(true);
    setResult(null);

    const res = await contentApi.review(siteId, content, kwList);
    setRunning(false);

    if (!res.success) {
      setRunError(res.success === false ? res.error : 'Failed');
      addToast('error', `Content review failed: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }

    setResult(res.data);
    addToast('success', `Content review complete — ${res.data.suggestions.length} suggestions`);
  }

  return (
    <div className="fade-in max-w-4xl p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to site
      </button>

      {/* Header */}
      <div className="mb-6">
        <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Content SEO Review</span>
        <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">Content Analysis</h1>
        <p className="text-[var(--color-text-secondary)] mt-0.5 text-sm">
          Paste your content and target keywords — Groq will analyze SEO quality, keyword usage, structure, and
          readability.
        </p>
      </div>

      {/* Input form */}
      <div className="mb-6 space-y-4">
        {/* Target keywords */}
        <div>
          <label className="text-[var(--color-text-secondary)] mb-1.5 block text-xs font-medium tracking-wide">Target Keywords</label>
          <input
            value={targetKeywords}
            onChange={(e) => setTargetKeywords(e.target.value)}
            placeholder="content marketing, SEO strategy, blog writing"
            className="text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]/60 focus:ring-[var(--color-accent)]/20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--color-border)] focus:ring-1 focus:outline-none"
          />
          <p className="text-[var(--color-text-tertiary)] mt-1 text-[10px]">Comma-separated</p>
        </div>

        {/* Content */}
        <div>
          <label className="text-[var(--color-text-secondary)] mb-1.5 block text-xs font-medium tracking-wide">Page Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the full text content of the page you want to analyze…"
            rows={8}
            className="text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]/60 focus:ring-[var(--color-accent)]/20 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--color-border)] focus:ring-1 focus:outline-none"
          />
        </div>

        <Button size="sm" onClick={handleReview} loading={running}>
          Analyze Content
        </Button>

        {runError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-900/20 dark:text-red-300">
            {runError}
          </div>
        )}
      </div>

      {/* Results */}
      {running && !result && <LoadingSkeleton rows={3} height="h-20" />}

      {result && (
        <div className="space-y-4">
          {/* Overall assessment + readability */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">Overall Assessment</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${READABILITY_STYLES[result.estimatedReadability] ?? 'text-[var(--color-text-tertiary)] border-[var(--color-border)] bg-[var(--color-surface)]'}`}
              >
                Readability: {result.estimatedReadability}
              </span>
            </div>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{result.overallAssessment}</p>
          </div>

          {/* Suggestions */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">Suggestions ({result.suggestions.length})</p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {result.suggestions.map((s, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="mb-1.5 flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-400">
                      Issue
                    </span>
                    <p className="text-[var(--color-text-primary)] text-sm font-medium">{s.issue}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Fix
                    </span>
                    <p className="text-[var(--color-text-secondary)] text-sm">{s.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
