var express = require('express');
var router = express.Router();
var VacancyModel = require('../models/Vacancy');
var JobseekerModel = require('../models/Jobseeker');
var customUtils = require('../utils')
var fs = require('fs')
var dbUtils = require('../dbUtils')
var passport = require('passport')
var constants = require('../constants')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var multer = require('multer');

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
    /**
     * Note the leaderId is stored in this collection denormalized,
     * however graph relations have been made as well to support
     * the possibility of a jobseeker being connected to multiple leaders
     */
    //get all jobseekers
    //params : trade, education, age, lat, long, radius
    //if you send me a leaderId, then only the leaders jobseekers will appear
    //or just use the leaders/jobseekers api,
    //club graphResults along with filter
    //sorted in increasing order of distance

    var promises = []
    //var userId = req.user.results[0].value.id
    var queries = []
    var responseObj = {}

    var page = req.query.page || 1
    var limit = req.query.limit || 100
    var offset = limit * (page - 1)
    var isDistanceQuery = false

    queries.push("@path.kind:item")

    if (req.query.leaderId) {
        console.log("leader's jobseer query")
        queries.push(dbUtils.createFieldQuery("leaderId", req.query.leaderId))
    }

    if (req.query.id) {
        console.log("we have a specific vacancyId query")
        queries.push(dbUtils.createSearchByIdQuery(req.query.id))
    }

    if (req.query.lat && req.query.long && req.query.radius) {
        console.log("we have a distance query")
        queries.push(dbUtils.createDistanceQuery(req.query.lat, req.query.long, req.query.radius))
        isDistanceQuery = true;
    }

    if (req.query.age) {
        console.log("we have an age query")
        var ageQuery = VacancyModel.createAgeQuery(req.query.age)
        console.log(ageQuery)
        queries.push(ageQuery)
    }

    if (req.query.educationLevel) {
        console.log("minimum education query")
        queries.push(VacancyModel.createEducationQuery(req.query.educationLevel))
    }

    if (req.query.communication) {
        console.log("minimum communication query")
        queries.push(VacancyModel.createCommunicationQuery(req.query.communication))
    }

    if (req.query.license) {
        console.log("minimum license query")
        queries.push(VacancyModel.createLicenseQuery(req.query.license))
    }

    if (req.query.computer) {
        console.log("minimum computer proficiency query")
        queries.push(VacancyModel.createComputerQuery(req.query.computer))
    }

    if (req.query.hasSmartphone) {
        console.log("hasSmartphone query")
        queries.push(VacancyModel.createHasSmartPhoneQuery(req.query.hasSmartphone))
    }

    if (req.query.hasBike) {
        console.log("hasBike query")
        queries.push(VacancyModel.createHasBikeQuery(req.query.hasBike))
    }

    if (req.query.trade) {
        console.log("trade query")
        queries.push(JobseekerModel.createTradeQuery(req.query.trade))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)
    console.log("final query")
    console.log(theFinalQuery)

    if (isDistanceQuery) {
        db.newPatchBuilder()
        var distanceQuery = db.newSearchBuilder()
            .collection("jobseekers")
            .limit(limit)
            .offset(offset)
            .sortBy('value.location', 'distance:asc')
            .query(theFinalQuery)
        promises.push(distanceQuery)
    } else {
        /**
         * remove sort by location if query does not have
         * location. the orchestrate query won't work otherwise
         */
        var distanceLessQuery = db.newSearchBuilder()
            .collection("jobseekers")
            .limit(limit)
            .offset(offset)
            .sortBy('@path.reftime:desc')
            .query(theFinalQuery)
        promises.push(distanceLessQuery)
    }

    kew.all(promises)
        .then(function (results) {
            if (distanceQuery) {
                results[0] = customUtils.insertDistance(results[0], req.query.lat, req.query.long)
            }
            if (req.query.showLeaders) {
                return JobseekerModel.injectLeader(results[0])
            } else {
                console.log("no injection")
                return kew.resolve(results[0])
            }
        })
        .then(function (results) {
            responseObj["total_count"] = results.body.total_count
            responseObj["data"] = dbUtils.injectId(results)
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 503, res)
        })
}])

router.post('/', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    req.body.leaderId = req.body.leaderId || req.user.results[0].path.key;
    var otp = req.body.otp
    JobseekerModel.validatePostPromise(req)
        .then(function (validations) {
            var errors = validations.errors
            var jobSeekerPayload = validations.req.body

            if (errors) {
                customUtils.sendErrors(errors, res)
                console.log("errors")
                console.log(errors)
            } else {
                customUtils.upload(req.files.avatar, function (theImageInS3) {
                    jobSeekerPayload["avatar"] = ((theImageInS3) ? theImageInS3.url : "")
                    jobSeekerPayload["avatarThumb"] = ((theImageInS3) ? theImageInS3.urlThumb : "")

                    JobseekerModel.create(jobSeekerPayload["leaderId"], jobSeekerPayload)
                        .then(function (response) {
                            var message = "Your OTP : " + otp
                            if (otp) customUtils.sendSms(message, jobSeekerPayload.mobile)
                            res.send({
                                data: response
                            })
                            res.status(200)
                        })
                        .fail(function (err) {
                            customUtils.sendErrors(err, res)
                        })
                })
            }
        })
        .fail(function (err) {
            console.log("limbo")
            console.log(err)
        })
}])

router.patch('/', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    var jobseekerId = req.query.id
    var otp = req.body.otp

    JobseekerModel.validatePatchPromise(req)
        .then(function (validations) {
            var errors = validations.errors
            var jobSeekerPayload = validations.req.body

            if (errors) {
                console.log("errors")
                console.log(errors)
                customUtils.sendErrors(errors, res)
            } else {
                console.log("heres the jobSeekerPayload")
                console.log(jobSeekerPayload)
                customUtils.upload(req.files.avatar, function (theImageInS3) {
                    jobSeekerPayload["avatar"] = ((theImageInS3) ? theImageInS3.url : undefined)
                    jobSeekerPayload["avatarThumb"] = ((theImageInS3) ? theImageInS3.urlThumb : undefined)

                    db.merge("jobseekers", jobseekerId, jobSeekerPayload)
                        .then(function (response) {
                            return db.get("jobseekers", jobseekerId)
                        })
                        .then(function (jobseeker) {
                            jobseeker["body"]["id"] = jobseekerId
                            if (otp) customUtils.sendSms(message, jobSeekerPayload.mobile)
                            res.send({
                                data: jobseeker.body
                            })
                            res.status(200)
                        })
                        .fail(function (err) {
                            customUtils.sendErrors(err, res)
                        })
                })
            }
        })
}])

router.post('/verify', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    var otp = req.body.otp
    customUtils.sendSms()

}])

router.delete('/', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    var jobseekerId = req.query.id
    db.remove('jobseekers', jobseekerId, true)
        .then(function (result) {
            res.send({
                data: {}
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 422, res)
        })
}])

module.exports = router