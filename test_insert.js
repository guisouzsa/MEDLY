const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://anklywcqejajskvmwuxv.supabase.co';
const supabaseKey = 'sb_publishable_tRuKY8SCC6Iuvk-xN_BETQ_Gc-7tzL6';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // 1. Let's list one item to see columns
    console.log('Fetching one item...');
    const { data: selectData, error: selectError } = await supabase
      .from('historico')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('Select error:', selectError);
    } else {
      console.log('Select success. Row columns:', selectData[0] ? Object.keys(selectData[0]) : 'empty table', selectData);
    }

    // 2. Let's try inserting a dummy item
    console.log('\nTrying to insert with usuario_id and user_id...');
    const { data: insertData, error: insertError } = await supabase
      .from('historico')
      .insert({
        usuario_id: 'd9b7f58d-71b5-4a3b-8c8d-64cbf4d8e8b2', // dummy uuid
        user_id: 'd9b7f58d-71b5-4a3b-8c8d-64cbf4d8e8b2',
        descricao: 'Teste de inserção do script',
        data: new Date().toISOString()
      });

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Insert success:', insertData);
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

test();
