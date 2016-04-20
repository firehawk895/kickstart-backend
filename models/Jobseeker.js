var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var constants = require('../constants')
var kew = require('kew')

function create(leaderId, jobseekerPayload) {
    var createdJobSeekerPromise = kew.defer()
    db.post("jobseekers", jobseekerPayload)
        .then(function (result) {
            console.log("hey yo")
            var jobseekerId = dbUtils.getIdAfterPost(result)
            jobseekerPayload["id"] = jobseekerId
            console.log("las hey")
            return kew.all([
                dbUtils.createGraphRelationPromise('users', leaderId, 'jobseekers', jobseekerId, constants.graphsRelations.leader.myJobseekers),
                dbUtils.createGraphRelationPromise('jobseekers', jobseekerId, 'users', leaderId, constants.graphsRelations.jobseekers.myLeader)
            ])
        })
        .then(function (results) {
            createdJobSeekerPromise.resolve(jobseekerPayload)
        })
        .fail(function (err) {
            createdJobSeekerPromise.reject(err)
        })
    return createdJobSeekerPromise
}

function parseTrades() {
    
}

function incrementInterviews(jobseekerId) {
    return db.newPatchBuilder('jobseekers', jobseekerId)
        .inc('interview_count', 1)
        .apply()
}

module.exports = {
    create: create,
    incrementInterviews : incrementInterviews
}