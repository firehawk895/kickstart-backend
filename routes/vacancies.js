var express = require('express');
var router = express.Router();
var VacancyModel = require('../models/Vacancy');
var customUtils = require('../utils')

router.post('/', function (req, res, next) {
    var vacancyPayload = {
        jobTitle : req.body.jobTitle,
        compulsoryReqs: req.body.compulsoryReqs,
        preferredReqs: req.body.preferredReqs,
        company : req.body.company,
        salary_min : req.body.salary_min,
        salary_max : req.body.salary_max,
        food_accommodation : req.body.food_accommodation,
        education_min : req.body.education_min,
        guarantee_time : req.body.guarantee_time,
        comments : req.body.comments,
        age_min : req.body.age_min,
        age_max : req.body.age_max,
        location_name : req.body.location_name,
        location : {
            lat : req.body.lat,
            long : req.body.long
        },
        working_hours_min : req.body.working_hours_min,
        working_house_max : req.body.working_house_max,
        interview_dates : req.body.interview_dates //array
    }

    VacancyModel.create(vacancyPayload)
        .then(function(response) {
            res.send({
                data: response
            })
            res.status(200)
        })
        .fail(function(err) {
            customUtils.sendErrors(err, 422, res)
        })
})