var dbUtils = require('../dbUtils')
var constants = require('../constants')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var customUtils = require('../utils')
var JobseekerModel = require('../models/Jobseeker')
var dateFormat = require('dateformat');

function create(interviewPayload) {
    var theInterviewPromise = kew.defer()
    var compositeKey
    kew.all([
        dbUtils.createGraphRelationPromise("jobseekers", interviewPayload.jobseekerId, "vacancies", interviewPayload.vacancyId, constants.graphsRelations.jobseekers.interviews),
        dbUtils.createGraphRelationPromise("vacancies", interviewPayload.vacancyId, "jobseekers", interviewPayload.jobseekerId, constants.graphsRelations.vacancies.hasJobSeekers),
        JobseekerModel.getTheLeader(interviewPayload.jobseekerId)
    ])
        .then(function (results) {
            //another cool hack to maintain integrity
            compositeKey = interviewPayload.jobseekerId + interviewPayload.vacancyId
            interviewPayload["leaderId"] = results[2]
            //succeeds only if absent otherwise throws errors
            return db.put("interviews", compositeKey, interviewPayload, false)
        })
        .then(function (results) {
            interviewPayload["id"] = compositeKey
            theInterviewPromise.resolve(interviewPayload)
            kew.all([JobseekerModel.incrementInterviews(interviewPayload.jobseekerId)])
        })
        .fail(function (err) {
            theInterviewPromise.reject(err)
        })
    return theInterviewPromise
}

function edit(interviewId, interviewPayload) {
    return db.merge("interviews", interviewId, interviewPayload)
}

// function sendInterviewSms(jobseekerId, vacancyId, interviewTime) {
//     var smsStatus = kew.defer()
//     var message = ""
//     kew.all([db.get('vacancies', vacancyId), db.get('jobseekers', jobseekerId)])
//         .then(function(results) {
//             var vacancy = results[0]
//             var jobseeker = results[1]
//             message = "You have an interview at " + vacancy.location_name + " for " + vacancy.company + " at " + dateFormat(interviewTime, "dddd, mmmm dS, yyyy, h:MM:ss TT");
//             return customUtils.sendSms(message, jobseeker.mobile)
//         })
//         .then(function(res) {
//             smsStatus.resolve("")
//             console.log(message)
//             console.log("interview sms sent")
//         })
//         .fail(function (err) {
//             smsStatus.reject(err)
//             console.log("interview sms failed")
//             console.log(err)
//         })
//     return smsStatus
// }

/**
 * this is cool and all, but does not allow flexibility
 * what if I want the monetized interviews of the leader, either I need a filter of this result
 * or make a good query
 * @param leaderId
 * @returns {!Promise}
 */
function getLeadersInterviews(leaderId) {
    var leadersInterviewsPromise = kew.defer()
    db.newGraphReader()
        .get()
        .from('users', leaderId)
        .related(constants.graphsRelations.leader.hasJobSeekers, constants.graphsRelations.jobseekers.interviews)
        .then(function (results) {
            var injectedResults = dbUtils.injectId(results)
            leadersInterviewsPromise.resolve(injectedResults)
        })
        .fail(function (err) {
            leadersInterviewsPromise.reject(err)
        })
    return leadersInterviewsPromise
}

function extractIds(results) {
    function pushUnique(item, array) {
        if(array.indexOf(item) > -1) {
            //dont push
        } else {
            array.push(item)
        }
    }
    var vacancyIds = []
    var jobseekerIds = []
    results.body.results.forEach(function (item) {
        pushUnique(item.value.vacancyId, vacancyIds)
        pushUnique(item.value.jobseekerId, jobseekerIds)
    })

    return {
        vacancyIds: vacancyIds,
        jobseekerIds: jobseekerIds
    }
}

/**
 * injects the vacancy and jobseeker details in a normalized manner
 * to the imnterview data
 * @param interviewResults
 * @returns {!Promise}
 */
function injectVacancyAndJobseeker(interviewResults) {
    var injectedInterviews = kew.defer()
    var idLists = extractIds(interviewResults)

    kew.all([
        dbUtils.getAllResultsFromList("vacancies", idLists.vacancyIds),
        dbUtils.getAllResultsFromList("jobseekers", idLists.jobseekerIds)
    ])
        .then(function (results) {
            var vacancyMap = customUtils.createHashMap(results[0])
            var jobseekerMap = customUtils.createHashMap(results[1])
            interviewResults.body.results = interviewResults.body.results.map(function (anItem) {
                anItem.value["vacancy"] = vacancyMap[anItem.value.vacancyId]
                anItem.value["jobseeker"] = jobseekerMap[anItem.value.jobseekerId]
                return anItem
            })
            injectedInterviews.resolve(interviewResults)
        })
        .fail(function (err) {
            injectedInterviews.reject(err)
        })
    return injectedInterviews
}

/**
 * get an interview,
 * not using db.get so that other methods are compatible with the result
 * @param id
 * @returns {SearchBuilder}
 */
function getInterview(id) {
    var query = dbUtils.createSearchByIdQuery(id)
    return db.newSearchBuilder()
        .collection("interviews")
        .query(query)
}

module.exports = {
    create: create,
    edit: edit,
    getLeadersInterviews: getLeadersInterviews,
    injectVacancyAndJobseeker: injectVacancyAndJobseeker,
    getInterview : getInterview
}