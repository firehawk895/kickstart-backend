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
var multer = require('multer');

router.get('/test', function (req, res) {
    dbUtils.generateCsvFile("vacancies")
        .then(function (results) {
            // console.log(results)
        })
        .fail(function (err) {
            console.log(err)
        })
})

router.post('/', [ multer(), function (req, res) {
    console.log(req.body)
    var validations = VacancyModel.validatePostVacancy(req)
    var errors = validations.errors
    var vacancyPayload = validations.req.body

    if (errors) {
        customUtils.sendErrors(errors, res)
    } else {
        VacancyModel.create(vacancyPayload)
            .then(function (response) {
                vacancyPayload["id"] = dbUtils.getIdAfterPost(response)
                res.send({
                    data: vacancyPayload
                })
                res.status(200)
                eventSystem.dispatch(constants.events.newVacancy, vacancyPayload)
            })
            .fail(function (err) {
                customUtils.sendErrors(err, res)
            })
    }
}])

router.patch('/', [multer(), function (req, res) {
    var id = req.query.id
    //TODO : also support additional fields

    var validations = VacancyModel.validatePatchVacancy(req)
    var errors = validations.errors
    var vacancyPayload = validations.req.body

    if (errors) {
        customUtils.sendErrors(errors, res)
    } else {
        console.log("all cool")
        db.merge("vacancies", id, vacancyPayload)
            .then(function (res) {
                return db.get("vacancies", id)
            })
            .then(function (vacancy) {
                var theVacancy = vacancy.body
                theVacancy["id"] = id
                res.send({
                    data: [theVacancy]
                })
                res.status(201)
            })
            .fail(function (err) {
                customUtils.sendErrors(err, res)
            })
    }
}])

router.get('/', [passport.authenticate('bearer', {session: false}), function (req, res) {
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
        console.log(VacancyModel.createCommunicationQuery(req.query.communication))
    }

    if (req.query.license) {
        console.log("minimum license query")
        queries.push(VacancyModel.createLicenseQuery(req.query.license))
    }

    if (req.query.computer) {
        console.log("minimum computer proficiency query")
        queries.push(VacancyModel.createComputerQuery(req.query.computer))
    }

    //not mapping smartphone for a while
    // if (req.query.hasSmartphone) {
    //     console.log("hasSmartphone query")
    //     queries.push(VacancyModel.createHasSmartPhoneQuery(req.query.hasSmartphone))
    // }

    if (req.query.hasBike) {
        console.log("hasBike query")
        queries.push(VacancyModel.createHasBikeQuery(req.query.hasBike))
    }

    if (req.query.trade) {
        console.log("trade query")
        queries.push(dbUtils.createFieldQuery("trade", req.query.trade))
    }

    var theFinalQuery = dbUtils.queryJoiner(queries)
    console.log("final query")
    console.log(theFinalQuery)

    if (isDistanceQuery) {
        var distanceQuery = db.newSearchBuilder()
            .collection("vacancies")
            .limit(limit)
            .offset(offset)
            .sort('location', 'distance:asc')
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
            .sortBy('@path.reftime:desc')
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

    //Notes:
    //get all vacancies
    //primary sort location
    //secondary sort time (default)
    //params:
    //age, education, trade, lat, long, radius
    //sorted in increasing order of distance
    //id= will give 1 vacancies details
}])

router.get('/autocomplete', [passport.authenticate('bearer', {session: false}), function (req, res) {
    var responseObj = {}
    dbUtils.getAllItemsWithFields("vacancies", "@path.kind:item", ["value.jobTitle", "value.company", "value.location_name"])
        .then(function(results) {
            // responseObj["total_count"] = results.body.total_count
            responseObj["data"] = results
            res.status(200)
            res.json(responseObj)
        })
        .fail(function (err) {
            customUtils.sendErrors(err, res)
        })
}])

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