//========================================================================================================
var async = require('async');
var lodash = require('lodash');

//========================================================================================================
var database = require('../database');
var helpers = require('../helpers');
var config = require('../credentials/events-conf.json');

//========================================================================================================
// Constructor
var EventProcessor = function () {
};

//========================================================================================================
// Create new event record and return latest previous one
EventProcessor.prototype.updateEventRecords = function (eventMessage, callback) {
    console.log("EventProcessor:UpdateEventRecords");
    var currentHistoryId = eventMessage.historyId;

    //-------------------------    
    var promise = new Promise((fulfill, reject) => {

        async.waterfall([

            // Get last event historyId
            function (next) {
                console.log("EventProcessor:UpdateEventRecords:GetLatestEvent");
                database.getLatestEvent((err, event) => {
                    if (err) return next(err);
                    if (!event)
                        return next(null, config.watchHistoryId);
                    
                    next(null, event.historyId);
                });
            },

            // Create new event record
            function(lastHistoryId, next) {
                console.log("EventProcessor:UpdateEventRecords:AddNewEvent");                    
                database.addNewEvent({historyId: currentHistoryId}, (err) => {                    
                    if (err) return next(err);
                    next(null, lastHistoryId);
                });
            }

        ], function (err, lastHistoryId) {            
            if (err) return reject(err);            
            if (lastHistoryId > currentHistoryId)
                return reject(new Error('Event should already be processed'));
            fulfill(lastHistoryId);
        });
    });

    //-------------------------        
    return helpers.wrapAPI(promise, callback);
};

//========================================================================================================
module.exports = EventProcessor;