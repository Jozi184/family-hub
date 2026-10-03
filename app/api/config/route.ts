import {publicConfig,json} from '../../../lib/supabase/server';
export function GET(){try{return json(publicConfig())}catch{return json({error:'Služba přihlášení není připravená.'},503)}}
