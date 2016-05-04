var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var constants = require('../constants')
var customUtils = require('../utils')
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

function getTheLeader(jobseekerId) {
    var leaderId = kew.defer()
    db.get("jobseekers", jobseekerId)
        .then(function (jobseeker) {
            leaderId.resolve(jobseeker.body.leaderId)
        })
        .fail(function (err) {
            leaderId.reject(err)
        })
    return leaderId
}

function injectLeader(jobseekerResults) {
    var injectedJobseeker = kew.defer()
    var leaderIds = extractLeaderIds(jobseekerResults)
    
    dbUtils.getAllResultsFromList("users", leaderIds)
        .then(function (results) {
            var leaderMap = customUtils.createHashMap(results)
            jobseekerResults.body.results = jobseekerResults.body.results.map(function (anItem) {
                anItem.value["leader"] = leaderMap[anItem.value.leaderId]
                return anItem
            })
            injectedJobseeker.resolve(jobseekerResults)
        })
        .fail(function (err) {
            injectedJobseeker.reject(err)
        })
    return injectedJobseeker
}

function extractLeaderIds(results) {
    var leaderIds = []

    function pushUnique(item) {
        if (leaderIds.indexOf(item) > -1) {
            //dont push
        } else {
            leaderIds.push(item)
        }
    }

    results.body.results.forEach(function (item) {
        pushUnique(item.value.leaderId)
    })

    return leaderIds
}

function incrementInterviews(jobseekerId) {
    return db.newPatchBuilder('jobseekers', jobseekerId)
        .inc('interview_count', 1)
        .apply()
}

module.exports = {
    create: create,
    incrementInterviews: incrementInterviews,
    getTheLeader: getTheLeader,
    injectLeader : injectLeader
}