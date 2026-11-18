const mongoose = require('mongoose');


const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['csv', 'json', 'txt'] },
    size: { 
        type: Number, 
        required: true },
    content: { 
        type: Buffer, 
        required: true },
    status: { 
        type: String,
        required: true,
        enum: ['indexed', 'ingesting', 'validated', 'failed'], 
    },
    logcontent: {
        type: String,
    },
    indexedCount: {
        type: Number,
        default: 0
    },
    indexedAt: {
        type: Date
    },
    indexingError: {
        type: String
    },
    uploadDate: { type: Date, default: Date.now }
});

exports.File = mongoose.model('File', fileSchema);
