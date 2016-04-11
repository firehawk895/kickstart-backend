var express = require('express');
var router = express.Router();
var VacancyModel = require('../models/Vacancy');
var customUtils = require('../utils')
var dbUtils = require('../dbUtils')

var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var kew = require('kew');
var eventSystem = require('../listeners/listeners')
var constants = require('../constants')

router.post('/', function (req, res, next) {
    var interviewDatesArray = req.body.interview_dates.map(function(date) {
        return parseInt(date)
    })
    var vacancyPayload = {
        jobTitle : req.body.jobTitle,
        compulsoryReqs: req.body.compulsoryReqs,
        preferredReqs: req.body.preferredReqs,
        company : req.body.company,
        salary_min : parseInt(req.body.salary_min),
        salary_max : parseInt(req.body.salary_max),
        food_accommodation : customUtils.stringToBoolean(req.body.food_accommodation),
        educationLevel : parseInt(req.body.educationLevel),
        pf: req.body.pf,
        esi: req.body.esi,
        guarantee_time : req.body.guarantee_time, //right now in days
        comments : req.body.comments,
        age_min : parseInt(req.body.age_min),
        age_max : parseInt(req.body.age_max),
        location_name : req.body.location_name,
        location : {
            lat : parseFloat(req.body.lat),
            long : parseFloat(req.body.long)
        },
        working_hours_min : req.body.working_hours_min, //decide what format do you need this time in
        working_house_max : req.body.working_house_max,
        interview_dates : interviewDatesArray, //array
        trade : req.body.trade
    }

    VacancyModel.create(vacancyPayload)
        .then(function(response) {
            vacancyPayload["id"] = dbUtils.getIdAfterPost(response)
            res.send({
                data: vacancyPayload
            })
            res.status(200)
            eventSystem.dispatch(constants.events.newVacancy, vacancyPayload)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, 422, res)
        })
})

router.get('/', function(req, res) {
    var promises = []
    //var userId = req.user.results[0].value.id
    var queries = []
    var responseObj = {}

    var page = req.query.page || 1
    var limit = req.query.limit || 100
    var offset = limit * (page - 1)
    var isDistanceQuery = false

    queries.push("@path.kind:item")

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
            .collection("vacancies")
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
            .collection("vacancies")
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

    //Notes:
    //get all vacancies
    //primary sort location
    //secondary sort time (default)
    //params:
    //age, education, trade, lat, long, radius
    //sorted in increasing order of distance
    //id= will give 1 vacancies details
})

module.exports = router