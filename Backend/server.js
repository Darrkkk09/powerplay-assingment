const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const Company = require('./models/company');
const Customer = require('./models/customer');
const Invoice = require('./models/invoice');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// --- INVOICE ROUTES ---

// Get paginated, filterable, and sortable invoices
app.get('/api/invoices', async (req, res, next) => {
    try {
        const query = {};

        if (req.query.status) {
            query.status = req.query.status;
        }

        if (req.query.taxRate !== undefined && req.query.taxRate !== '') {
            query.taxRate = Number(req.query.taxRate);
        }

        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            query.$or = [
                { invoiceId: searchRegex },
                { 'customerSnapshot.name': searchRegex },
                { 'companySnapshot.name': searchRegex }
            ];
        }

        if (req.query.customer) {
            if (mongoose.Types.ObjectId.isValid(req.query.customer)) {
                query.customer = req.query.customer;
            } else {
                query['customerSnapshot.name'] = { $regex: req.query.customer, $options: 'i' };
            }
        }

        if (req.query.issueDateStart || req.query.issueDateEnd) {
            query.issueDate = {};
            if (req.query.issueDateStart) query.issueDate.$gte = new Date(req.query.issueDateStart);
            if (req.query.issueDateEnd) query.issueDate.$lte = new Date(req.query.issueDateEnd);
        }

        if (req.query.dueDateStart || req.query.dueDateEnd) {
            query.dueDate = {};
            if (req.query.dueDateStart) query.dueDate.$gte = new Date(req.query.dueDateStart);
            if (req.query.dueDateEnd) query.dueDate.$lte = new Date(req.query.dueDateEnd);
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20; 
        const skip = (page - 1) * limit;

        const allowedSorts = ['amount', 'dueDate', 'issueDate', 'invoiceId'];
        const sortBy = allowedSorts.includes(req.query.sortBy) ? req.query.sortBy : 'issueDate';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const invoices = await Invoice.find(query)
            .populate('customer', 'name')
            .populate('company', 'name')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        const totalCount = await Invoice.countDocuments(query);

        res.json({
            invoices,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch invoices' });
    }
});

// Global totals and aggregate stats for dashboard overview
app.get('/api/invoices/summary', async (req, res) => {
    try {
        const financialStats = await Invoice.aggregate([
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$total' },
                    totalTax: { $sum: '$tax' },
                    outstanding: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['Sent', 'Unpaid', 'Overdue']] },
                                '$total',
                                0
                            ]
                        }
                    },
                    invoiceCount: { $sum: 1 }
                }
            }
        ]);

        const customerCount = await Customer.countDocuments({});
        const stats = financialStats[0] || { totalBilled: 0, totalTax: 0, outstanding: 0, invoiceCount: 0 };

        res.json({
            totalBilled: stats.totalBilled ? parseFloat(stats.totalBilled.toString()) : 0,
            totalTax: stats.totalTax ? parseFloat(stats.totalTax.toString()) : 0,
            outstanding: stats.outstanding ? parseFloat(stats.outstanding.toString()) : 0,
            invoiceCount: stats.invoiceCount || 0,
            customerCount: customerCount || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating platform summary' });
    }
});

// Create new invoice with point-in-time snapshot records
app.post('/api/invoices', async (req, res) => {
    try {
        const { invoiceId, customer: customerId, amount, taxRate, status, issueDate, dueDate } = req.body;

        if (!invoiceId || !customerId || amount === undefined || taxRate === undefined || !status || !issueDate || !dueDate) {
            return res.status(400).json({ message: 'All required invoice fields must be provided' });
        }

        const customer = await Customer.findById(customerId).populate('company');
        if (!customer) return res.status(404).json({ message: 'Customer record not found' });

        const company = customer.company;
        if (!company) return res.status(404).json({ message: 'No company relation linked to this customer' });

        const existing = await Invoice.findOne({ invoiceId });
        if (existing) return res.status(400).json({ message: `Invoice number ${invoiceId} is already assigned` });

        const newInvoice = new Invoice({
            invoiceId,
            customer: customer._id,
            company: company._id,
            amount: mongoose.Types.Decimal128.fromString(parseFloat(amount).toFixed(2)),
            taxRate,
            status,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            customerSnapshot: { name: customer.name },
            companySnapshot: { name: company.name },
        });

        await newInvoice.save();
        res.status(201).json(newInvoice);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error processing new invoice' });
    }
});

// Update an invoice
app.put('/api/invoices/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid reference ID format' });
        }

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Synchronize and update snapshot data if customer switches
        if (req.body.customer && req.body.customer !== invoice.customer.toString()) {
            const customer = await Customer.findById(req.body.customer).populate('company');
            if (!customer) return res.status(404).json({ message: 'Target customer record missing' });

            invoice.customer = customer._id;
            invoice.company = customer.company._id;
            invoice.customerSnapshot = { name: customer.name };
            invoice.companySnapshot = { name: customer.company.name };
        }

        if (req.body.invoiceId) invoice.invoiceId = req.body.invoiceId;
        if (req.body.amount !== undefined) {
            invoice.amount = mongoose.Types.Decimal128.fromString(parseFloat(req.body.amount).toFixed(2));
        }
        if (req.body.taxRate !== undefined) invoice.taxRate = req.body.taxRate;
        if (req.body.status) invoice.status = req.body.status;
        if (req.body.issueDate) invoice.issueDate = new Date(req.body.issueDate);
        if (req.body.dueDate) invoice.dueDate = new Date(req.body.dueDate);

        await invoice.save();
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update invoice details' });
    }
});

// Delete an invoice
app.delete('/api/invoices/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid reference ID format' });
        }
        const deleted = await Invoice.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Invoice target not found' });

        res.json({ message: 'Invoice dropped successfully', id: deleted._id });
    } catch (error) {
        res.status(500).json({ message: 'Error removing invoice entity' });
    }
});


// Get form selectors selector mapping
app.get('/api/customers', async (req, res, next) => {
    try {
        const customers = await Customer.find().populate('company', 'name').sort({ name: 1 });
        const result = customers.map((c) => ({
            id: c._id,
            name: c.name,
            companyName: c.company ? c.company.name : 'N/A',
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to parse customer selector listings' });
    }
});

// Top 5 customers aggregation pipeline
app.get('/api/customers/top-five', async (req, res, next) => {
    try {
        const topCustomers = await Invoice.aggregate([
            {
                $group: {
                    _id: '$customer',
                    totalBilled: { $sum: '$total' },
                    invoiceCount: { $sum: 1 },
                },
            },
            { $sort: { totalBilled: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails',
                },
            },
            { $unwind: '$customerDetails' },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'customerDetails.company',
                    foreignField: '_id',
                    as: 'companyDetails',
                },
            },
            { $unwind: '$companyDetails' },
            {
                $project: {
                    _id: 1,
                    name: '$customerDetails.name',
                    companyName: '$companyDetails.name',
                    totalBilled: 1,
                    invoiceCount: 1,
                },
            },
        ]);

        const result = topCustomers.map((c) => ({
            id: c._id.toString(),
            name: c.name,
            companyName: c.companyName,
            totalBilled: parseFloat(c.totalBilled.toString()),
            invoiceCount: c.invoiceCount,
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to process top billing records' });
    }
});

// Individual customer profile context 
app.get('/api/customers/:id', async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid customer identifier format' });
        }

        const customer = await Customer.findById(req.params.id).populate('company');
        if (!customer) return res.status(404).json({ message: 'Customer record could not be found' });

        const history = await Invoice.find({ customer: customer._id }).sort({ issueDate: -1 });

        const metricsResult = await Invoice.aggregate([
            { $match: { customer: customer._id } },
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: '$total' },
                    invoiceCount: { $sum: 1 },
                    paidAmount: {
                        $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$total', 0] },
                    },
                    unpaidAmount: {
                        $sum: { $cond: [{ $in: ['$status', ['Sent', 'Unpaid', 'Overdue']] }, '$total', 0] },
                    },
                },
            },
        ]);

        const metrics = metricsResult[0] || {};
        const formattedMetrics = {
            totalBilled: metrics.totalBilled ? parseFloat(metrics.totalBilled.toString()) : 0,
            invoiceCount: metrics.invoiceCount || 0,
            paidAmount: metrics.paidAmount ? parseFloat(metrics.paidAmount.toString()) : 0,
            unpaidAmount: metrics.unpaidAmount ? parseFloat(metrics.unpaidAmount.toString()) : 0,
        };

        res.json({
            customer: {
                id: customer._id,
                name: customer.name,
                companyName: customer.company ? customer.company.name : 'N/A',
            },
            metrics: formattedMetrics,
            history,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving profile analytical history' });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});