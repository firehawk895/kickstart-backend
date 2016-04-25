var config = require('../config.js');
var oio = require('orchestrate');
oio.ApiEndPoint = config.db.region;
var db = oio(config.db.key);
var dbUtils = require('../dbUtils')
var constants = require('../constants')

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
    return dbUtils.createExistsQuery("value."+trade)
}


module.exports = {
    create: create,
    createAgeQuery: createAgeQuery,
    createEducationQuery: createEducationQuery,
    createTradeQuery: createTradeQuery,
}