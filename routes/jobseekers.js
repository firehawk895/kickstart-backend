var express = require('express');
var router = express.Router();
var VacancyModel = require('../models/Vacancy');
var JobseekerModel = require('../models/Jobseeker');
var customUtils = require('../utils')
var dbUtils = require('../dbUtils')
var passport = require('passport')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');

router.post('/', [passport.authenticate('bearer', {session: false}),function (req, res, next) {
    var leaderId = req.user.results[0].path.key;

    var jobSeekerPayload = {
        name : req.body.name,
        mobile : req.body.mobile,
        educationLevel : parseInt(req.body.educationLevel),
        workEx : parseInt(req.body.workEx),
        mobileVerified : false,
        interview_count : 0,
        location_name : req.body.location_name,
        location : {
            lat : parseFloat(req.body.lat),
            long : parseFloat(req.body.long)
        },
        gender : req.body.gender,
        dateOfBirth : parseInt(req.body.dateOfBirth),
        preferredTrades : req.body.preferredTrades,
        otherTrade : req.body.otherTrade,
        leaderId : leaderId //denormalized for easy search, but graph relationships included
    }

    console.log("leader id " + leaderId)
    console.log(jobSeekerPayload)

    JobseekerModel.create(leaderId, jobSeekerPayload)
        .then(function(response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, 422, res)
        })
}])

router.get('/', function(req, res) {
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

    if(req.query.leaderId) {
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

    if(req.query.age) {
        console.log("we have an age query")
        var ageQuery = VacancyModel.createAgeQuery(req.query.age)
        console.log(ageQuery)
        queries.push(ageQuery)
    }

    if(req.query.educationLevel) {
        console.log("minimum education query")
        queries.push(VacancyModel.createEducationQuery(req.query.educationLevel))
    }

    if(req.query.trade) {
        console.log("trade query")
        queries.push(VacancyModel.createTradeQuery(req.query.trade))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)
    console.log("final query")
    console.log(theFinalQuery)

    if(isDistanceQuery) {
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
        .then(function(results) {
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

module.exports = router