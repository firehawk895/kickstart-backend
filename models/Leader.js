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

module.exports = {
    getLeadersJobseekers : getLeadersJobseekers
}