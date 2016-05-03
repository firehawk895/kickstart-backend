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
var passport = require('passport')

router.post('/', function (req, res, next) {
    var vacancyPayload = {
        jobTitle : req.body.jobTitle,//
        compulsoryReqs: req.body.compulsoryReqs, //text
        preferredReqs: req.body.preferredReqs, //text
        company : req.body.company,//company dropdown list
        salary_min : parseInt(req.body.salary_min), //unsigned int whole number
        salary_max : parseInt(req.body.salary_max),//unsigned int whole number
        food_accommodation : customUtils.stringToBoolean(req.body.food_accommodation),//bool
        educationLevel : req.body.educationLevel,//dropdown list
        pfesi: req.body.pf, //bool
        guarantee_time : req.body.guarantee_time, //right now in days
        comments : req.body.comments,
        age_min : parseInt(req.body.age_min), //unsigned int
        age_max : parseInt(req.body.age_max), //unsigned int
        location_name : req.body.location_name,//
        location : {
            lat : parseFloat(req.body.lat),//usual lat
            long : parseFloat(req.body.long)//usual long
        },
        working_hours: req.body.working_hours, //no. of hours
        interview_date_start: req.body.interview_date_start,//unix timestamp
        interview_date_end: req.body.interview_date_end,//unix timestamp
        trade : req.body.trade, //dropdown list
        showTop: customUtils.stringToBoolean(req.body.showTop),
        communication: req.body.communication,
        license: req.body.license,
        computer: req.body.computer,
        hasBike: customUtils.stringToBoolean(req.body.hasBike),
        hasSmartphone: customUtils.stringToBoolean(req.body.hasSmartphone)
    }

    //TODO : also support additional fields

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

router.patch('/', function (req, res, next) {
    var id = req.query.id
    var vacancyPayload = {
        jobTitle : req.body.jobTitle,//
        compulsoryReqs: req.body.compulsoryReqs, //text
        preferredReqs: req.body.preferredReqs, //text
        company : req.body.company,//company dropdown list
        salary_min : customUtils.myParseInt(req.body.salary_min), //unsigned int whole number
        salary_max : customUtils.myParseInt(req.body.salary_max),//unsigned int whole number
        food_accommodation : customUtils.stringToBoolean(req.body.food_accommodation),//bool
        educationLevel : req.body.educationLevel,//dropdown list
        pfesi: req.body.pf, //bool
        guarantee_time : req.body.guarantee_time, //right now in days
        comments : req.body.comments,
        age_min : customUtils.myParseInt(req.body.age_min), //unsigned int
        age_max : customUtils.myParseInt(req.body.age_max), //unsigned int
        location_name : req.body.location_name,//
        location : {
            lat : customUtils.myParseFloat(req.body.lat),//usual lat
            long : customUtils.myParseFloat(req.body.long)//usual long
        },
        working_hours: req.body.working_hours, //no. of hours
        interview_date_start: req.body.interview_date_start,//unix timestamp
        interview_date_end: req.body.interview_date_end,//unix timestamp
        trade : req.body.trade, //dropdown list
        showTop: customUtils.stringToBoolean(req.body.showTop),
        communication: req.body.communication,
        license: req.body.license,
        computer: req.body.computer,
        hasBike: customUtils.stringToBoolean(req.body.hasBike),
        hasSmartphone: customUtils.stringToBoolean(req.body.hasSmartphone)
    }

    //TODO : also support additional fields

    db.merge("vacancies", id, vacancyPayload)
        .then(function(res) {
            return db.get("vacancies", id)
        })
        .then(function(vacancy) {
            vacancy["id"] = id
            res.send({
                data: [vacancy]
            })
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, res)
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
        queries.push(dbUtils.createFieldQuery("trade", req.query.trade))
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
            .sortBy('@path.reftime', 'asc')
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

router.delete('/', [passport.authenticate('bearer', {session: false}), function (req, res, next) {
    var vacancyId = req.query.id

    db.remove('vacancy', vacancyId, true)
        .then(function (result) {
            res.send({
                data: {}
            })
            res.status(200)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, res)
        })
}])

module.exports = router