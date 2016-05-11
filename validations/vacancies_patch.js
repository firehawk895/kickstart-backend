/**
 * I have no clue why
 * I need to put optional : undefined
 * for the patch converted schema to work
 * do let me know if you ever find out
 * 
 * and POST doesnt work if you do that
 * hence no schema convertor
 * seperate schemas SIGHHH!
 */
var constants = require('../constants')
module.exports = {
    'jobTitle': {
        optional : true,
        notEmpty : {
            errorMessage: 'jobTitle cannot be empty'
        }
    },
    'company': {
        optional : true,
        notEmpty: {
            errorMessage: 'company cannot be empty'
        }
    },
    'salary_min': {
        optional: true,
        isInt: {
            errorMessage: 'Minimum salary cannot be empty'
        }
    },
    'salary_max': {
        optional: true,
        isInt: {
            errorMessage: 'Maximum salary cannot be empty'
        }
    },
    'food_accommodation': {
        optional: true,
        isBoolean: {
            errorMessage: 'Food/Accomodation must be true/false'
        }
    },
    'educationLevel': {
        optional: true,
        isIn: {
            options: [Object.keys(constants.education)],
            errorMessage: 'Please enter a valid education level : ' + Object.keys(constants.education)
        }
    },
    'pfesi': {
        optional: true,
        isBoolean: {
            errorMessage: 'Food/Accommodation must be true/false'
        }
    },
    'guarantee_time': {
        optional: true,
        isInt: {
            errorMessage: 'Enter a valid guarantee time'
        }
    },
    'display_location': {
        optional: true,
        errorMessage: "Display location cannot be empty"
    },
    'location_name': {
        optional: true,
        errorMessage: "Location cannot be empty"
    },
    'lat': {
        optional: true,
        isLat: {
            errorMessage: "Enter a valid latitude"
        }
    },
    'long': {
        optional: true,
        isLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'working_hours': {
        optional: true,
        isInt: {
            errorMessage: 'working_hours cannot be empty'
        }
    },
    'interview_dates': {
        optional: true,
        isValidInterviewDate: {
            errorMessage: "Make sure all interview dates are valid"
        }
    },
    'trade': {
        optional: true,
        isIn: {
            options: [constants.trades],
            errorMessage: "Please enter a valid trade"
        }
    },
    'showTop': {
        optional: true,
        isBoolean: {
            showTop: "showTop must be true/false"
        }
    },
    'communication': {
        optional: true,
        isIn: {
            options: [Object.keys(constants.communication)],
            errorMessage: "Enter valid communication data"
        }
    },
    'license': {
        optional: true,
        isIn: {
            options: [Object.keys(constants.license)],
            errorMessage: 'Please enter a valid education level'
        }
    },
    'computer': {
        optional: true,
        isIn: {
            options : [Object.keys(constants.computer)],
            errorMessage: "Enter a valid Computer profieciency"
        }
    },
    'hasBike': {
        optional: true,
        isBoolean: {
            errorMessage: "hasBike must be true/false"
        }
    },
    'hasSmartphone': {
        optional: true,
        isBoolean: {
            errorMessage: "hasSmartphone must be true/false"
        }
    }
}