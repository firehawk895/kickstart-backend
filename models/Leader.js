var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var customUtils = require('../utils')
var constants = require('../constants')

var date = new Date();
var kew = require('kew');

function getLeadersJobseekers(leaderId) {
    var jobseekerPromise = kew.defer()
    dbUtils.getGraphResultsPromise('users', leaderId, constants.graphsRelations.leader.myJobseekers)
        .then(function (results) {
            var injectedResults = dbUtils.injectId(results)
            jobseekerPromise.resolve(injectedResults)
        })
        .fail(function (err) {
            jobseekerPromise.reject(err)
        })
    return jobseekerPromise
}

function validatePostLeaderPromise(req) {
    var leaderValidation = require('../validations/leader')
    console.log(leaderValidation)
    return customUtils.validateMePromise(req, leaderValidation, sanitizePayload)
}

function validatePatchLeaderPromise(req) {
    var leaderValidation = require('../validations/leader')
    var patchSchema = customUtils.schemaConverter(leaderValidation)
    return customUtils.validateMePromise(req, patchSchema, sanitizePayload)
}

var sanitizePayload = function (reqBody) {
    var leaderPayload = {
        name : reqBody.name,
        mobile : reqBody.mobile,
        isVerified: customUtils.stringToBoolean(reqBody.isVerified)
    }
    return leaderPayload
}

module.exports = {
    getLeadersJobseekers : getLeadersJobseekers,
    validatePostLeaderPromise : validatePostLeaderPromise,
    validatePatchLeaderPromise : validatePatchLeaderPromise
}