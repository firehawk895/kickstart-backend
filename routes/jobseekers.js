var express = require('express');
var router = express.Router();
var JobseekerModel = require('../models/Jobseeker');
var customUtils = require('../utils')
var passport = require('passport');

router.post('/', [passport.authenticate('bearer', {session: false}),function (req, res, next) {
    var leaderId = req.user.results[0].value.id;

    var jobSeekerPayload = {
        name : req.body.name,
        mobile : req.body.mobile,
        educationLevel : parseInt(req.body.education),
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
})

module.exports = router