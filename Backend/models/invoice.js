const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: [true, 'Invoice ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Amount is required'],
    },
    taxRate: {
      type: Number,
      required: [true, 'Tax rate is required'],
      enum: {
        values: [0, 3, 5, 18, 28],
        message: '{VALUE} is not a valid tax rate (must be 0, 3, 5, 18, or 28)',
      },
    },
    tax: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Tax is required'],
    },
    total: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Total is required'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'],
        message: '{VALUE} is not a valid invoice status',
      },
      index: true,
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    // Point-in-time snapshots to ensure historical invoices remain correct even if master files change
    customerSnapshot: {
      name: {
        type: String,
        required: true,
      },
    },
    companySnapshot: {
      name: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ status: 1, issueDate: -1 });
invoiceSchema.index({ customer: 1, issueDate: -1 });
invoiceSchema.index({ amount: 1 });
invoiceSchema.index({ dueDate: -1 });

invoiceSchema.pre('validate', function () {
  if (this.amount && typeof this.taxRate === 'number') {
    const amountNum = parseFloat(this.amount.toString());
    const taxRateNum = this.taxRate;

    const tax = Math.round((amountNum * taxRateNum) / 100 * 100) / 100;
    const total = Math.round((amountNum + tax) * 100) / 100;

    this.tax = mongoose.Types.Decimal128.fromString(tax.toFixed(2));
    this.total = mongoose.Types.Decimal128.fromString(total.toFixed(2));
  }
});


const transformDecimal = (doc, ret) => {
  if (ret._id) ret.id = ret._id.toString();
  if (ret.amount) ret.amount = parseFloat(ret.amount.toString());
  if (ret.tax) ret.tax = parseFloat(ret.tax.toString());
  if (ret.total) ret.total = parseFloat(ret.total.toString());
  return ret;
};

invoiceSchema.set('toJSON', {
  transform: transformDecimal,
  virtuals: true,
});
invoiceSchema.set('toObject', {
  transform: transformDecimal,
  virtuals: true,
});

module.exports = mongoose.model('Invoice', invoiceSchema);
