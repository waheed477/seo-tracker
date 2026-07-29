/**
 * Tests for the AuditPage component.
 *
 * Verifies that the page renders audit results correctly given mock data.
 * API calls are mocked — no real network requests.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuditPage from './AuditPage';

// Mock audit data
const mockAudit = {
  _id: 'audit-123',
  siteId: 'site-456',
  status: 'done' as const,
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:02:00Z',
  results: {
    pagesCrawled: ['https://example.com/', 'https://example.com/about', 'https://example.com/contact'],
    technical: {
      missingMetaDescriptions: ['https://example.com/about'],
      missingTitleTags: [],
      duplicateTitles: [],
      headingIssues: [{ url: 'https://example.com/contact', issue: 'Missing H1' }],
      missingAltText: [{ url: 'https://example.com/', imageCount: 3 }],
      robotsTxt: { found: true, disallowsEverything: false },
      sitemapXml: { found: true, urlCount: 12 },
      brokenInternalLinks: [],
    },
  },
  createdAt: '2024-01-15T10:00:00Z',
};

const mockSite = {
  _id: 'site-456',
  workspaceId: 'ws-789',
  domain: 'example.com',
  gscConnected: false,
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock the API module
vi.mock('../api/api', () => ({
  auditApi: {
    run: vi.fn(),
    latest: vi.fn(),
  },
  siteApi: {
    get: vi.fn(),
  },
}));

// Mock the auth store — Zustand selectors call useAuthStore(selectorFn)
// We need to return the full state object when called without a selector,
// and let the selector function pick the field when called with one.
const mockAuthState = {
  token: 'fake-jwt-token',
  user: { id: '123', email: 'test@test.com', name: 'Test' },
  isAuthenticated: true,
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
};
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
}));

// Mock the toast store
vi.mock('../store/toastStore', () => ({
  useToastStore: (selector: any) =>
    selector({
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
    }),
}));

// Mock useParams to return a fixed siteId
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ siteId: 'site-456' }),
    useNavigate: () => vi.fn(),
  };
});

function renderAuditPage() {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuditPage />} />
      </Routes>
    </BrowserRouter>,
  );
}

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit results with issue counts', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    // Wait for the domain name to appear
    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    // Check that the audit results are rendered
    await waitFor(() => {
      expect(screen.getByText('Pages crawled')).toBeInTheDocument();
      expect(screen.getByText('Total issues')).toBeInTheDocument();
      expect(screen.getByText('Broken links')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });
  });

  it('renders the Robots & Sitemap section', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Robots & Sitemap')).toBeInTheDocument();
    });
  });

  it('renders the Meta Tags section', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Meta Tags')).toBeInTheDocument();
    });
  });

  it('renders the Heading Structure section', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Heading Structure')).toBeInTheDocument();
    });
  });

  it('renders the Image Alt Text section', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Image Alt Text')).toBeInTheDocument();
    });
  });

  it('shows the re-run audit button when a completed audit exists', async () => {
    const { siteApi, auditApi } = await import('../api/api');
    (siteApi.get as any).mockResolvedValue({ success: true, data: mockSite });
    (auditApi.latest as any).mockResolvedValue({ success: true, data: mockAudit });

    renderAuditPage();

    await waitFor(() => {
      expect(screen.getByText('Re-run audit')).toBeInTheDocument();
    });
  });
});
