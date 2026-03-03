const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'raptr_dxp_db'
};

async function check() {
    try {
        const pool = mysql.createPool(dbConfig);
        const [rows] = await pool.query('SELECT id, name, status FROM projects');
        console.log('PROJECTS FOUND:', rows.length);
        console.log('ROWS:', JSON.stringify(rows));
        await pool.end();
    } catch (err) {
        console.error('DIAGNOSTIC FAILED:', err);
    }
}
check();
