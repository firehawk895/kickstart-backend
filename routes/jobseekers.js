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

router.get('/', function (req, res) {
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

    if (req.query.trade) {
        console.log("trade query")
        queries.push(VacancyModel.createTradeQuery(req.query.trade))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)
    console.log("final query")
    console.log(theFinalQuery)

    if (isDistanceQuery) {
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
            //.sortBy('value.location', 'distance:asc')
            .query(theFinalQuery)
        promises.push(distanceLessQuery)
    }

    kew.all(promises)
        .then(function (results) {
            if (distanceQuery) {
                results[0] = customUtils.insertDistance(results[0], req.query.lat, req.query.long)
            }
            responseObj["total_count"] = results[0].body.total_count
            responseObj["data"] = dbUtils.injectId(results[0])
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors([err.body.message], 503, res)
        })
})

// router.post('/trades', [passport.authenticate('bearer', {session: false}), function (req, res) {
//     var responseObj = {}
//     var userId = req.user.results[0].value.id;
//     var jobseekerId = req.query.id;
//
//     //The great hack to not use json as input
//     var comments = req.body.comments
//     req.body.comments = undefined
//
//     console.log("updating trades")
//     db.merge("jobseekers", jobseekerId, {
//         trades: req.body,
//         hasSelectedTrades: true,
//         comments: comments
//         //sportsList: Object.keys(req.body)
//     })
//         .then(function (result) {
//             responseObj["data"] = [];
//             responseObj["msg"] = "Trades Updated";
//             res.status(201);
//             res.json(responseObj);
//         })
//         .fail(function (err) {
//             customUtils.sendErrors([err.body.message], 422, res)
//         })
// }])

router.post('/', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    var leaderId = req.body.leaderId || req.user.results[0].path.key;
    var otp = req.body.otp
    var hasSelectedTrades = false
    customUtils.upload(req.files.avatar, function (theImageInS3) {
        console.log(theImageInS3)
        var jobSeekerPayload = {
            name: req.body.name,
            mobile: req.body.mobile,
            educationLevel: req.body.educationLevel,
            mobileVerified: false,
            interview_count: 0,
            location_name: req.body.location_name,
            location: {
                lat: parseFloat(req.body.lat),
                long: parseFloat(req.body.long)
            },
            gender: req.body.gender,
            hasSelectedTrades: false,
            dateOfBirth: parseInt(req.body.dateOfBirth),
            lastSalary: req.body.lastSalary,
            jobStatus: req.body.jobStatus,
            communication: req.body.communication,
            hasBike: customUtils.stringToBoolean(req.body.hasBike),
            license: req.body.license,
            hasSmartphone: customUtils.stringToBoolean(req.body.hasSmartphone),
            computer: req.body.computer,
            // trades: {},
            comments: req.body.comments,
            leaderId: leaderId, //denormalized for easy search, but graph relationships included
            avatar: ((theImageInS3) ? theImageInS3.url : ""),
            avatarThumb: ((theImageInS3) ? theImageInS3.urlThumb : "")
        }

        constants.trades.forEach(function (trade) {
            if (req.body[trade])
                hasSelectedTrades = true
            if (req.body[trade])
                jobSeekerPayload["trades"][trade] = req.body[trade]
        })
        jobSeekerPayload["hasSelectedTrades"] = hasSelectedTrades

        console.log("leader id " + leaderId)
        console.log(jobSeekerPayload)

        JobseekerModel.create(leaderId, jobSeekerPayload)
            .then(function (response) {
                var message = "Your OTP : " + otp
                customUtils.sendSms(message, jobSeekerPayload.mobile)
                res.send({
                    data: response
                })
                res.status(200)
            })
            .fail(function (err) {
                customUtils.sendErrors(err, 422, res)
            })
    })
}])

router.patch('/', [passport.authenticate('bearer', {session: false}), multer(), function (req, res) {
    var jobseekerId = req.query.id
    if (req.body.lat) req.body.lat = parseFloat(req.body.lat)
    if (req.body.long) req.body.long = parseFloat(req.body.long)
    if (req.body.hasBike) req.body.hasBike = customUtils.stringToBoolean(req.body.hasBike)
    if (req.body.hasSmartphone) req.body.hasSmartphone = customUtils.stringToBoolean(req.body.hasSmartphone)
    var hasSelectedTrades = false

    customUtils.upload(req.files.avatar, function (theImageInS3) {
        var jobSeekerPayload = {
            name: req.body.name,
            mobile: req.body.mobile,
            educationLevel: req.body.educationLevel,
            mobileVerified: customUtils.stringToBoolean(req.body.mobileVerified),
            location_name: req.body.location_name,
            location: {
                lat: req.body.lat,
                long: req.body.long
            },
            gender: req.body.gender,
            dateOfBirth: req.body.dateOfBirth,
            lastSalary: req.body.lastSalary,
            jobStatus: req.body.jobStatus,
            communication: req.body.communication,
            hasBike: req.body.hasBike,
            license: req.body.license,
            hasSmartphone: req.body.hasSmartphone,
            computer: req.body.computer,
            // trades: {},
            comments: req.body.comments,
            //leaderId: leaderId, //denormalized for easy search, but graph relationships included
            image: theImageInS3
        }
        var tradesPayload = {}

        constants.trades.forEach(function (trade) {
            if (req.body[trade]) {
                hasSelectedTrades = true
                tradesPayload[trade] = req.body[trade]
            }
            else
                tradesPayload[trade] = null //ensures an old key is deleted
        })
        
        console.log("hasSelectedTrade : " + hasSelectedTrades)
        
        if(hasSelectedTrades) {
            jobSeekerPayload["trades"] = tradesPayload
            jobSeekerPayload["hasSelectedTrades"] = hasSelectedTrades
        }
        

        console.log(jobSeekerPayload)

        db.merge("jobseekers", jobseekerId, jobSeekerPayload)
            .then(function (response) {
                return db.get("jobseekers", jobseekerId)
            })
            .then(function (jobseeker) {
                res.send({
                    data: jobseeker.body
                })
                res.status(200)
            })
            .fail(function (err) {
                customUtils.sendErrors(err, 422, res)
            })
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