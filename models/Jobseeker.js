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

function getUserByPhoneNumber(mobile) {
    return db.newSearchBuilder()
        .collection('jobseekers')
        .query('value.mobile:`' + mobile + '`')
}

function checkIfNewUser(mobile) {
    var newUser = kew.defer()
    getUserByPhoneNumber(mobile)
        .then(function (result) {
            console.log("examine this")
            console.log(result.body)
            if (result.body.total_count == 0) {
                newUser.resolve("")
            } else {
                newUser.reject(new Error("The user already exists"))
            }
        })
        .fail(function (err) {
            console.log("how")
            console.log(err)
            newUser.reject(err)
        })
    return newUser
}

function incrementInterviews(jobseekerId) {
    return db.newPatchBuilder('jobseekers', jobseekerId)
        .inc('interview_count', 1)
        .apply()
}

function validatePos(req) {
    var validation = require('../validations/jobseeker')
    return customUtils.validateMe(req, validation, sanitizePayload)
}

function validatePatch(req) {
    var patchSchema = require('../validations/vacancies_patch')
    console.log(patchSchema)
    return customUtils.validateMe(req, patchSchema, sanitizePayload)
}

var sanitizePayload = function (reqBody) {
    var jobSeekerPayload = {
        name: reqBody.name,
        mobile: reqBody.mobile,
        educationLevel: reqBody.educationLevel,
        mobileVerified: false,
        interview_count: 0,
        location_name: reqBody.location_name,
        location: {
            lat: customUtils.myParseFloat(reqBody.lat),
            long: customUtils.myParseFloat(reqBody.long)
        },
        gender: reqBody.gender,
        hasSelectedTrades: false,
        dateOfBirth: customUtils.myParseInt(reqBody.dateOfBirth),
        lastSalary: reqBody.lastSalary,
        communication: reqBody.communication,
        hasBike: customUtils.stringToBoolean(reqBody.hasBike),
        license: reqBody.license,
        hasSmartphone: customUtils.stringToBoolean(reqBody.hasSmartphone),
        computer: reqBody.computer,
        trades: {},
        comments: reqBody.comments,
        leaderId: leaderId, //denormalized for easy search, but graph relationships included
        avatar: ((theImageInS3) ? theImageInS3.url : ""),
        avatarThumb: ((theImageInS3) ? theImageInS3.urlThumb : "")
    }

    constants.trades.forEach(function (trade) {
        if (req.body[trade]) {
            hasSelectedTrades = true
            jobSeekerPayload["trades"][trade] = req.body[trade]
        }
    })
    jobSeekerPayload["hasSelectedTrades"] = hasSelectedTrades
}

var sanitizeTrades = function(req, payload) {

}

module.exports = {
    create: create,
    incrementInterviews: incrementInterviews,
    getTheLeader: getTheLeader,
    injectLeader : injectLeader,
    checkIfNewUser : checkIfNewUser
}