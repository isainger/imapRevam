const dotenv =require('dotenv')
const express= require('express')
const cors = require('cors')
const mysql= require('mysql2')
const fs= require('fs')

dotenv.config()

const app=express();
app.use(cors())
app.use(express.json())

const sslCA = fs.readFileSync('./cert.pem');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  ssl: {
    ca: sslCA
  }
});

db.connect((err)=>{
    if(err){
        console.error('DB connection failed:', err);
    }
    else {
    console.log('Connected to MySQL/TiDB');
  }
})

const PORT=process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});