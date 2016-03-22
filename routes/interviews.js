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
 */

//schedule an interview
router.post('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var leaderId = req.user.results[0].path.key;
    //use for authorization of leader
    //only a leader to which the jobseeker belongs to can schedule an interview

    var interviewPayload = {
        vacancyId: req.body.vacancyId,
        jobseekerId: req.body.jobseekerId,
        interviewTime: req.body.interviewTime,
        status: constants.interviewStatus.scheduled
    }

    InterviewModel.create(interviewPayload)
        .then(function (response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, 422, res)
        })
}])

//patch an interview (change status), any other additional details such as joining date
//update the status and additional details of an interview
router.patch('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var interviewId = req.body.interviewId
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
            res.send({
                data: response
            })
            res.status(200)
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

    if (req.query.leaderId) {
        isLeaderQuery = true
        promises.push(InterviewModel.getLeadersInterviews(req.query.leaderId))
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

    if (!isLeaderQuery) {
        var distanceLessQuery = db.newSearchBuilder()
            .collection("interviews")
            .limit(limit)
            .offset(offset)
            .query(finalQuery)
        promises.push(distanceLessQuery)
    }

    kew.all(promises)
        .then(function (results) {
            responseObj["total_count"] = results[0].body.total_count
            responseObj["data"] = dbUtils.injectId(results[0])
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 503, res)
        })
}])

module.exports = router
