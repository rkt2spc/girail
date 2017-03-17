var mongoose = require('mongoose');

//------------------------------------------------------------------------
// Schema definition
var eventSchema = mongoose.Schema({
    historyId   : { type: Number, required: true, unique: true, index: true },
});

//------------------------------------------------------------------------
// Schema Statics


//------------------------------------------------------------------------
// Exports
module.exports = mongoose.model('Event', eventSchema);