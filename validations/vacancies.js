/**
 * I have no clue why
 * I need to put optional : undefined 
 * for the patch converted schema to work
 * do let me know if you ever find out
 */
var constants = require('../constants')
module.exports = {
    'jobTitle': {
        optional: undefined,
        notEmpty: true,
        errorMessage: 'jobTitle cannot be empty'
    },
    'company': {
        optional: undefined,
        notEmpty: true,
        errorMessage: 'company cannot be empty'
    },
    'salary_min': {
        optional: undefined,
        isInt: {
            errorMessage: 'Minimum salary cannot be empty'
        }
    },
    'salary_max': {
        optional: undefined,
        isInt: {
            errorMessage: 'Maximum salary cannot be empty'
        }
    },
    'food_accommodation': {
        optional: undefined,
        isBoolean: {
            errorMessage: 'Food/Accomodation must be true/false'
        }
    },
    'educationLevel': {
        optional: undefined,
        isIn: {
            options: [Object.keys(constants.education)],
            errorMessage: 'Please enter a valid education level : ' + Object.keys(constants.education)
        }
    },
    'pfesi': {
        optional: undefined,
        isBoolean: {
            errorMessage: 'Food/Accommodation must be true/false'
        }
    },
    'guarantee_time': {
        optional: undefined,
        isInt: {
            errorMessage: 'Enter a valid guarantee time'
        }
    },
    'display_location': {
        optional: undefined,
        notEmpty: true,
        errorMessage: "Display location cannot be empty"
    },
    'location_name': {
        optional: undefined,
        notEmpty: true,
        errorMessage: "Location cannot be empty"
    },
    'lat': {
        optional: undefined,
        isLatLong: {
            errorMessage: "Enter a valid latitude"
        }
    },
    'long': {
        optional: undefined,
        isLatLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'working_hours': {
        optional: undefined,
        isInt: {
            errorMessage: 'working_hours cannot be empty'
        }
    },
    'interview_dates': {
        optional: undefined,
        isValidInterviewDate: {
            errorMessage: "Make sure all interview dates are valid"
        }
    },
    'trade': {
        optional: undefined,
        isIn: {
            options: [constants.trades],
            errorMessage: "Please enter a valid trade"
        }
    },
    'showTop': {
        optional: undefined,
        optional: true,
        isBoolean: {
            showTop: "showTop must be true/false"
        }
    },
    'communication': {
        optional: undefined,
        isIn: {
            options: [Object.keys(constants.communication)],
            errorMessage: "Enter valid communication data"
        }
    },
    'license': {
        optional: undefined,
        isIn: {
            options: [Object.keys(constants.license)],
            errorMessage: 'Please enter a valid education level'
        }
    },
    'computer': {
        optional: undefined,
        isIn: {
            options : [Object.keys(constants.computer)],
            errorMessage: "Enter a valid Computer profieciency"
        }
    },
    'hasBike': {
        optional: undefined,
        isBoolean: {
            errorMessage: "hasBike must be true/false"
        }
    },
    'hasSmartphone': {
        optional: undefined,
        isBoolean: {
            errorMessage: "hasSmartphone must be true/false"
        }
    }
}