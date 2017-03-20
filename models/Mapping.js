var mongoose = require('mongoose');

//------------------------------------------------------------------------
// Schema definition
var mappingSchema = mongoose.Schema({
    messageId           : { type: String, trim: true },
    threadId            : { type: String, trim: true },

    // After interacted with Jira
    issueId             : { type: String, trim: true },
    issueKey            : { type: String, trim: true },
    commentId           : { type: String, trim: true },

    // In case of manual reconstruction
    corrupted           : { type: Boolean, default: false},
    reconstructMetadata : { type: String }
});

mappingSchema.index({messageId: 1}, {unique: true});

//------------------------------------------------------------------------
// Schema Statics


//------------------------------------------------------------------------
// Exports
module.exports = mongoose.model('Mapping', mappingSchema);