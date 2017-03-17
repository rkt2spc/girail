var mongoose = require('mongoose');

//------------------------------------------------------------------------
// Schema definition
var mappingSchema = mongoose.Schema({
    messageId   : { type: String, trim: true, unique: true, index: true },
    emailId     : { type: String, trim: true, unique: true, index: true },
    issueId     : { type: String, trim: true },
    issueKey    : { type: String, trim: true },
    commentId   : { type: String, trim: true }
});

//------------------------------------------------------------------------
// Schema Statics


//------------------------------------------------------------------------
// Exports
module.exports = mongoose.model('Mapping', mappingSchema);