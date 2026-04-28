import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership before deleting
  const { data: test } = await supabase
    .from('tests')
    .select('id')
    .eq('id', testId)
    .eq('user_id', user.id)
    .single();

  if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', testId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { success: true } });
}
