#!/bin/sh
set -eu
node -e '
const {Pool}=require("pg"); const pool=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{for(let attempt=0;attempt<30;attempt++){try{await pool.query("SELECT 1");await pool.end();return;}catch{await new Promise(r=>setTimeout(r,2000));}}throw new Error("Database unavailable after 60 seconds");})().catch(e=>{console.error(e.message);process.exit(1);});'
exec npm start
