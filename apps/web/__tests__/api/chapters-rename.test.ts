import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '../helpers/mock-supabase';

const sb = { getUser: vi.fn(), from: vi.fn() };
const admin = { from: vi.fn(), storage: { from: vi.fn() } };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: sb.getUser }, from: sb.from }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: admin.from, storage: admin.storage }),
}));

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };

function makePatchRequest(id: string, body: object) {
  return new Request(`http://localhost/api/chapters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/chapters/${id}`, { method: 'DELETE' });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── PATCH (rename) ─────────────────────────────────────────────────────────

describe('PATCH /api/chapters/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { PATCH } = await import('@/app/api/chapters/[id]/route');
    const res = await PATCH(makePatchRequest('ch-1', { name: 'New Name' }) as never, makeParams('ch-1') as never);

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 400 when name field is missing', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { PATCH } = await import('@/app/api/chapters/[id]/route');
    const res = await PATCH(makePatchRequest('ch-1', {}) as never, makeParams('ch-1') as never);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('name required');
  });

  it('returns 400 when name is whitespace-only', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });

    const { PATCH } = await import('@/app/api/chapters/[id]/route');
    const res = await PATCH(makePatchRequest('ch-1', { name: '   ' }) as never, makeParams('ch-1') as never);

    expect(res.status).toBe(400);
  });

  it('returns 200 on successful rename', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { PATCH } = await import('@/app/api/chapters/[id]/route');
    const res = await PATCH(
      makePatchRequest('ch-1', { name: 'Chapter 5: Motion' }) as never,
      makeParams('ch-1') as never,
    );

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('returns 500 when the database update fails', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));

    const { PATCH } = await import('@/app/api/chapters/[id]/route');
    const res = await PATCH(
      makePatchRequest('ch-1', { name: 'New Name' }) as never,
      makeParams('ch-1') as never,
    );

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('DB error');
  });
});

// ── DELETE ─────────────────────────────────────────────────────────────────

describe('DELETE /api/chapters/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    admin.storage.from.mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) });
  });

  it('returns 401 when not authenticated', async () => {
    sb.getUser.mockResolvedValue({ data: { user: null } });

    const { DELETE } = await import('@/app/api/chapters/[id]/route');
    const res = await DELETE(makeDeleteRequest('ch-1') as never, makeParams('ch-1') as never);

    expect(res.status).toBe(401);
  });

  it('returns 404 when the chapter is not found', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { DELETE } = await import('@/app/api/chapters/[id]/route');
    const res = await DELETE(makeDeleteRequest('ch-missing') as never, makeParams('ch-missing') as never);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Chapter not found');
  });

  it('returns 200 and deletes chapter without a storage file', async () => {
    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: { id: 'ch-1', file_url: null }, error: null }));
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const { DELETE } = await import('@/app/api/chapters/[id]/route');
    const res = await DELETE(makeDeleteRequest('ch-1') as never, makeParams('ch-1') as never);

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    // Storage should not be touched
    expect(admin.storage.from).not.toHaveBeenCalled();
  });

  it('removes the storage file when file_url is present', async () => {
    const fileUrl =
      'https://proj.supabase.co/storage/v1/object/public/chapter-files/user-1/ch-1.pdf';

    sb.getUser.mockResolvedValue({ data: { user: MOCK_USER } });
    sb.from.mockReturnValue(makeChain({ data: { id: 'ch-1', file_url: fileUrl }, error: null }));
    admin.from.mockReturnValue(makeChain({ data: null, error: null }));

    const removeMock = vi.fn().mockResolvedValue({ error: null });
    admin.storage.from.mockReturnValue({ remove: removeMock });

    const { DELETE } = await import('@/app/api/chapters/[id]/route');
    const res = await DELETE(makeDeleteRequest('ch-1') as never, makeParams('ch-1') as never);

    expect(res.status).toBe(200);
    expect(admin.storage.from).toHaveBeenCalledWith('chapter-files');
    expect(removeMock).toHaveBeenCalledWith(['user-1/ch-1.pdf']);
  });
});
