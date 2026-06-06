const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env
dotenv.config();

const connectDB = require('./config/db');
const Company = require('./models/company');
const Customer = require('./models/customer');
const Invoice = require('./models/invoice');

const seedDataPath = path.join(__dirname, 'seed-data.json');
// console.log(seedDataPath);
const seed = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    console.log('Clearing existing collections...');
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Company.deleteMany({});
    console.log('Collections cleared.');

    console.log('Reading seed-data.json...');
    if (!fs.existsSync(seedDataPath)) {
      console.error(`Error: Seed data file not found at ${seedDataPath}`);
      process.exit(1);
    }
    const rawData = fs.readFileSync(seedDataPath, 'utf8');
    const invoicesData = JSON.parse(rawData);
    console.log(`Loaded ${invoicesData.length} raw invoice records.`);

    const companyNames = new Set();
    const customerToCompanyMap = new Map(); 

    invoicesData.forEach((item) => {
      if (item.company) {
        companyNames.add(item.company.trim());
      }
      if (item.customer && item.company) {
        customerToCompanyMap.set(item.customer.trim(), item.company.trim());
      }
    });

    // 4. Ingest Company Master Records
    const companyDocs = Array.from(companyNames).map((name) => ({ name }));
    const insertedCompanies = await Company.insertMany(companyDocs);

    // Create lookup map of company name to database ID
    const companyMap = new Map();
    insertedCompanies.forEach((c) => {
      companyMap.set(c.name, c._id);
    });

    // 5. Ingest Customer Master Records
    const customerDocs = [];
    customerToCompanyMap.forEach((companyName, customerName) => {
      const companyId = companyMap.get(companyName);
      if (!companyId) {
        console.warn(`Warning: Company ID not found for company "${companyName}" (customer: "${customerName}")`);
        return;
      }
      customerDocs.push({
        name: customerName,
        company: companyId,
      });
    });

    const insertedCustomers = await Customer.insertMany(customerDocs);

    // Create lookup map of customer name to database ID
    const customerMap = new Map();
    insertedCustomers.forEach((c) => {
      customerMap.set(c.name, c._id);
    });

    // 6. Prepare Invoice Records
    const invoiceDocs = [];

    for (const inv of invoicesData) {
      const custName = inv.customer.trim();
      const compName = inv.company.trim();

      const customerId = customerMap.get(custName);
      const companyId = companyMap.get(compName);

      if (!customerId || !companyId) {
        console.warn(`Warning: Missing mapping references for invoice ${inv.invoiceId}`);
        continue;
      }

      // Convert Date strings to native Date objects
      const issueDate = new Date(inv.issueDate);
      const dueDate = new Date(inv.dueDate);

      // Convert floating-point numbers to Decimal128 strings for Mongoose
      const amountDecimal = mongoose.Types.Decimal128.fromString(inv.amount.toFixed(2));
      const taxDecimal = mongoose.Types.Decimal128.fromString(inv.tax.toFixed(2));
      const totalDecimal = mongoose.Types.Decimal128.fromString(inv.total.toFixed(2));

      invoiceDocs.push({
        invoiceId: inv.invoiceId,
        customer: customerId,
        company: companyId,
        amount: amountDecimal,
        taxRate: inv.taxRate,
        tax: taxDecimal,
        total: totalDecimal,
        status: inv.status,
        issueDate: issueDate,
        dueDate: dueDate,
        // Point-in-time snapshot details for audit preservation
        customerSnapshot: { name: custName },
        companySnapshot: { name: compName },
      });
    }

    // 7. Bulk insert invoices in batches to demonstrate production scale
    const batchSize = 500;
    
    for (let i = 0; i < invoiceDocs.length; i += batchSize) {
      const batch = invoiceDocs.slice(i, i + batchSize);
      await Invoice.insertMany(batch);
      console.log(`Ingested batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(invoiceDocs.length / batchSize)}`);
    }

    console.log('Database seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('seeding error:', error);
    process.exit(1);
  }
};

seed();
