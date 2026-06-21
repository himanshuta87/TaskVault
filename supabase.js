require('dotenv').config(); // Fixed: Changed 'Require' to lowercase 'require'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchDatabase(userQuery) {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('verified_answer')
            .ilike('fourth_point_question', `%${userQuery}%`)
            .limit(1);

        if (error) throw error;
        if (data && data.length > 0) return data[0].verified_answer;
        
        return null;
    } catch (error) {
        console.error('Database Error:', error);
        return null;
    }
}

// Export both the supabase client (for inserting tasks) 
// and the searchDatabase function (for answering questions)
module.exports = { supabase, searchDatabase };
