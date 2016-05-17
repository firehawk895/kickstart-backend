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
    return customUtils.validateMePromise(req, leaderValidation, sanitizePayload)
}

function validatePatchLeaderPromise(req) {
    var leaderValidation = require('../validations/leader_patch')
    return customUtils.validateMePromise(req, leaderValidation, sanitizePayload)
}

function validatePostLogin(req) {
    var leaderValidation = require('../validations/leader_login')
    return customUtils.validateMe(req, leaderValidation, sanitizePayload)
}

var sanitizePayload = function (reqBody) {
    var leaderPayload = {
        name: reqBody.name,
        mobile: reqBody.mobile,
        isVerified: customUtils.stringToBoolean(reqBody.isVerified),
        location_name: reqBody.location_name,
        location : {
            lat: customUtils.myParseFloat(reqBody.lat),
            long: customUtils.myParseFloat(reqBody.long)
        }
    }
    return leaderPayload
}

var deleteAllTokens = function(leaderId) {
    var query = "value.user" + leaderId
    db.newSearchBuilder()
        .collection("tokens")
        .query(query)
        .then(function(results) {
            var theTokens = dbUtils.injectId(results)
            theTokens.forEach(function(theToken) {
                db.remove('tokens', theToken.id, true)
                    .then(function (result) {

                    })
                    .fail(function (err) {

                    })
            })
        })
}

module.exports = {
    getLeadersJobseekers: getLeadersJobseekers,
    validatePostLeaderPromise: validatePostLeaderPromise,
    validatePatchLeaderPromise: validatePatchLeaderPromise,
    validatePostLogin: validatePostLogin,
    deleteAllTokens : deleteAllTokens
}