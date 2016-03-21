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
        education : req.body.education,
        workEx : req.body.workEx,
        mobileVerified : false,
        interview_count : 0,
        location_name : req.body.location_name,
        location : {
            lat : req.body.lat,
            long : req.body.long
        },
        gender : req.body.gender,
        dateOfBirth : req.body.dateOfBirth
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

//schedule an interview
router.post('/interview', function(req, res) {

})

module.exports = router