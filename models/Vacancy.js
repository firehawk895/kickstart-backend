var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var constants = require('../constants')
var customUtils = require('../utils')

var date = new Date();
var kew = require('kew');

function create(vacancyPayload) {
    return db.post("vacancies", vacancyPayload)
}

/**
 * Lucene reference:
 * Your queries can contain as many as ten different buckets in a single Range Aggregate.
 * Each bucket can have numerical min and max values, separated by a tilde character (~).
 * An asterisk may be used to designate a particular range bucket as boundless.
 * For example, the range *~-10 would mean "all values less than negative ten" and
 * the range 100~* would communicate "all values greater than or equal to one hundred".
 * */

/**
 * a lucene query to match the min and max age requirement of a vacancy
 * @param age
 * @returns {*}
 */
function createAgeQuery(age) {
    var queries = []
    //this means greater than equalto
    queries.push("value.age_min:" + age + "~*")
    //this means less than equalto
    //queries.push("value.age_max:" + age + "*~")
    var finalQuery = dbUtils.queryJoiner(queries)
    return finalQuery
}

/**
 * query to return minimum education level.
 * the educationLevel is a number
 * @param educationLevel
 * @returns {string}
 */
function createEducationQuery(educationLevel) {
    /**
     * educationLevel: {
        "below 10th": 1,
        "10th pass": 2,
        "below 12th": 3,
        "12th pass": 4,
        "pursuing grad": 5,
        "graduate and above": 6
    }
     */
    return "value.educationLevel:[1 TO " + educationLevel + "]"
}

function createTradeQuery(trade) {
    return dbUtils.createExistsQuery("value.trades."+trade)
}

function validatePostVacancy(req) {
    var vacancyValidation = require('../validations/vacancies')
    return customUtils.validateMe(req, vacancyValidation, sanitizePayload)
}

function validatePatchVacancy(req) {
    var vacancyValidation = require('../validations/vacancies')
    var patchSchema = customUtils.schemaConverter(vacancyValidation)
    console.log(patchSchema)
    return customUtils.validateMe(req, patchSchema, sanitizePayload)
}

var sanitizePayload = function (reqBody) {
    var vacancyPayload = {
        jobTitle : reqBody.jobTitle,//
        compulsoryReqs: reqBody.compulsoryReqs, //text
        preferredReqs: reqBody.preferredReqs, //text
        company : reqBody.company,//company dropdown list
        salary_min : customUtils.myParseInt(reqBody.salary_min), //unsigned int whole number
        salary_max : customUtils.myParseInt(reqBody.salary_max),//unsigned int whole number
        food_accommodation : customUtils.stringToBoolean(reqBody.food_accommodation),//bool
        educationLevel : reqBody.educationLevel,//dropdown list
        pfesi: reqBody.pfesi, //bool
        guarantee_time : reqBody.guarantee_time, //right now in days
        comments : reqBody.comments,
        age_min : customUtils.myParseInt(reqBody.age_min), //unsigned int
        age_max : customUtils.myParseInt(reqBody.age_max), //unsigned int
        display_location : reqBody.display_location,//
        location_name : reqBody.location_name,//
        location : {
           lat : customUtils.myParseFloat(reqBody.lat),//usual lat
           long : customUtils.myParseFloat(reqBody.long)//usual long
        },
        working_hours: reqBody.working_hours, //no. of hours
        // interview_date_start: reqBody.interview_date_start,//unix timestamp
        // interview_date_end: reqBody.interview_date_end,//unix timestamp
        interview_dates: reqBody.interview_dates,
        trade : reqBody.trade, //dropdown list
        showTop: customUtils.stringToBoolean(reqBody.showTop),
        communication: reqBody.communication,
        license: reqBody.license,
        computer: reqBody.computer,
        hasBike: customUtils.stringToBoolean(reqBody.hasBike),
        hasSmartphone: customUtils.stringToBoolean(reqBody.hasSmartphone)
    }

    //if only 1 interview date then make sure it is converted to an array
    if (vacancyPayload.interview_dates && !Array.isArray(vacancyPayload.interview_dates)) {
        vacancyPayload.interview_dates = [vacancyPayload.interview_dates]
    }

    return vacancyPayload
}


module.exports = {
    create: create,
    createAgeQuery: createAgeQuery,
    createEducationQuery: createEducationQuery,
    createTradeQuery: createTradeQuery,
    validatePostVacancy : validatePostVacancy,
    validatePatchVacancy : validatePatchVacancy
}