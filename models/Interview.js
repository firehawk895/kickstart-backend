var express = require('express');
var dbUtils = require('../dbUtils')
var constants = require('../constants')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');

function create(interviewPayload) {
    var theInterviewPromise = kew.defer()
    kew.all([
        dbUtils.createGraphRelationPromise("jobseekers", interviewPayload.jobseekerId, "vacancies", interviewPayload.vacancyId, constants.graphsRelations.jobseekers.interviews),
        dbUtils.createGraphRelationPromise("vacancies", interviewPayload.vacancyId, "jobseekers", interviewPayload.jobseekerId, constants.graphsRelations.vacancies.hasJobSeekers)
    ])
        .then(function (result) {
            //another cool hack to maintain integrity
            var compositeKey = interviewPayload.jobseekerId + interviewPayload.vacancyId
            //succeeds only if absent otherwise throws errors
            return db.put("interviews", compositeKey, interviewPayload, false)
        })
        .then(function (results) {
            interviewPayload["id"] = dbUtils.getIdAfterPost(results)
            theInterviewPromise.resolve(interviewPayload)
        })
        .fail(function (err) {
            theInterviewPromise.reject(err)
        })
    return theInterviewPromise
}

function edit(interviewId, interviewPayload) {
    return db.merge("interviews", interviewId, interviewPayload)
}

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

module.exports = {
    create: create,
    edit: edit,
    getLeadersInterviews : getLeadersInterviews
}