 // scripts/load_data.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const connectDB = require('../config/db');
const Product = require('../models/productModel');

const loadProducts = async () => {
  await connectDB();
  
  // Clear existing data
  await Product.deleteMany({});
  
  const results = [];
  const filePath = path.join(__dirname, '..', 'data', 'products.csv');

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await Product.insertMany(results);
        console.log('Product data successfully loaded! 📦');
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        process.exit();
      }
    });
};

loadProducts();