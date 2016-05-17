var express = require('express');
var router = express.Router();
var InterviewModel = require('../models/Interview');

var constants = require('../constants')
var customUtils = require('../utils')
var dbUtils = require('../dbUtils')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var passport = require('passport');

/**
 * There are 2 choices to design this:
 * normalized:
 *      a graph relation can store properties. however AFAIK, the relational data
 *      must be retrieved for each item individually.
 * partially denormalized:
 *      graphRelation is as follows:
 *      leader -----> jobseekers ---> interviews
 *      with a double hop, all the interviews can be accessed
 *      Integrity can be easily maintained by allowing the graph relations to be created first
 *
 * perhaps the 3rd (maybe the typical mongo way) -- that does not maintain integrity
 * store the vacancyId, jobseekerId and inject/join data into it.
 */

//schedule an interview
router.post('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var responseObj = {}
    // var leaderId = req.user.results[0].path.key;
    //use for authorization of leader
    //only a leader to which the jobseeker belongs to can schedule an interview
    //TODO : who the hell will check for integrity of all these ids
    //TODO : do a validation of the interview dates

    var interviewPayload = {
        vacancyId: req.body.vacancyId,
        jobseekerId: req.body.jobseekerId,
        interviewTime: req.body.interviewTime,
        status: constants.interviewStatus.scheduled,
        // leaderId: leaderId //better you find the 
    }

    var vacancy
    var jobseeker
    kew.all([db.get('vacancies', interviewPayload.vacancyId), db.get('jobseekers', interviewPayload.jobseekerId)])
        .then(function (results) {
            vacancy = results[0]
            jobseeker = results[1]
            return InterviewModel.create(interviewPayload)
        })
        .then(function (interviewPayload) {
            return InterviewModel.getInterview(interviewPayload.id)
        })
        .then(function(interviewResults) {
            return InterviewModel.injectVacancyAndJobseeker(interviewResults)
        })
        .then(function(results) {
            var theResults = dbUtils.injectId(results)
            res.send({
                data: theResults
            })
            res.status(200)
            var message = "An interview has been scheduled for " +
                    "job details : " + theResults[0].vacancy.jobTitle + ", " + theResults[0].vacancy.company +
                    ". Time : " + customUtils.getFormattedDate(theResults[0].interviewTime)
            customUtils.sendSms(message, theResults[0].jobseeker.mobile)
        })
        .fail(function (err) {
            var errorObj = customUtils.getErrors(err)
            if(errorObj.statusCode === 412) {
                responseObj["errors"] = ["The interview for this candidate is already scheduled"]
                responseObj["obj"] = errorObj.err
                res.status(errorObj.statusCode)
                res.json(responseObj)
            } else {
                customUtils.sendErrors(err, res)
            }
        })
}])

//patch an interview (change status), any other additional details such as joining date
//update the status and additional details of an interview
router.patch('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var interviewId = req.query.id
    var interviewPayload = {
        //vacancyId: req.body.vacancyId,
        //jobseekerId: req.body.jobseekerId,
        interviewTime: req.body.interviewTime,
        status: req.body.status,
        joiningDate: req.body.joiningDate,
        leavingDate: req.body.leavingDate
    }
    
    InterviewModel.edit(interviewId, interviewPayload)
        .then(function (response) {
            return InterviewModel.getInterview(interviewId)
        })
        .then(function(interviewResults) {
            return InterviewModel.injectVacancyAndJobseeker(interviewResults)
        })
        .then(function(results) {
            var finalPayload = dbUtils.injectId(results)[0]
            res.send({
                data: [finalPayload]
            })
            res.status(200)
            var message =
                "Your interview has been updated! " +
                "status : " + finalPayload.status +
                 ", time : " + customUtils.getFormattedDate(finalPayload.interviewTime)

            //you obviously dont want to send an sms with the monetized status
            if(finalPayload.status == constants.interviewStatus.cleared || req.body.interviewTime)
                customUtils.sendSms(message, finalPayload.jobseeker.mobile)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, 422, res)
        })
}])

//get all interviews of candidates of a leader, filter with status
router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var leaderId = req.user.results[0].path.key;
    var promises = []
    //var userId = req.user.results[0].value.id
    var queries = []
    var responseObj = {}

    var page = req.query.page || 1
    var limit = req.query.limit || 100
    var offset = limit * (page - 1)

    queries.push("@path.kind:item")
    var isLeaderQuery = false

    if (req.query.id) {
        queries.push(dbUtils.createSearchByIdQuery(req.query.id))
    }

    if (req.query.leaderId) {
        queries.push(dbUtils.createFieldQuery('leaderId', req.query.leaderId))
        //cool stuff but not so cool stuff -->> promises.push(InterviewModel.getLeadersInterviews(req.query.leaderId))
    }

    if (req.query.status) {
        queries.push(dbUtils.createFieldQuery('status', req.query.status))
    }

    if (req.query.vacancyId) {
        queries.push(dbUtils.createFieldQuery('vacancyId', req.query.vacancyId))
    }

    if (req.query.jobseekerId) {
        queries.push(dbUtils.createFieldQuery('jobseekerId', req.query.jobseekerId))
    }

    if (req.query.status) {
        queries.push(dbUtils.createFieldQuery('status', req.query.status))
    }

    var finalQuery = dbUtils.queryJoiner(queries)

    var distanceLessQuery = db.newSearchBuilder()
        .collection("interviews")
        .limit(limit)
        .offset(offset)
        .sortBy('@path.reftime:desc')
        .query(finalQuery)
    promises.push(distanceLessQuery)

    kew.all(promises)
        .then(function (results) {
            return InterviewModel.injectVacancyAndJobseeker(results[0])
        })
        .then(function (injectedInterviews) {
            responseObj["total_count"] = injectedInterviews.body.total_count
            responseObj["data"] = dbUtils.injectId(injectedInterviews)
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 503, res)
        })
}])

router.get('/csv', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    
}])

// function sleeper(interviewResults) {
//     var sleeper = kew.defer()
//     sleep(5000, function() {
//         // executes after one second, and blocks the thread
//         sleeper.resolve(interviewResults)
//     });
//     return sleeper
// }
//
// function sleep(time, callback) {
//     var stop = new Date().getTime();
//     while(new Date().getTime() < stop + time) {
//         ;
//     }
//     callback();
// }

module.exports = router
