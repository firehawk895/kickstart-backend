var constants = require('../constants')
module.exports = {
    'jobTitle': {
        notEmpty: true,
        errorMessage: 'jobTitle cannot be empty'
    },
    'company': {
        notEmpty: true,
        errorMessage: 'company cannot be empty'
    },
    'salary_min': {
        notEmpty: true,
        isInt: {
            errorMessage: 'Minimum salary cannot be empty'
        }
    },
    'salary_max': {
        notEmpty: true,
        isInt: {
            errorMessage: 'Maximum salary cannot be empty'
        }
    },
    'food_accommodation': {
        notEmpty: true,
        isBoolean: {
            errorMessage: 'Food/Accomodation must be true/false'
        }
    },
    'educationLevel': {
        // notEmpty: true,
        isIn: {
            options: [Object.keys(constants.education)],
            errorMessage: 'Please enter a valid education level : ' + Object.keys(constants.education)
        }
    },
    'pfesi': {
        notEmpty: true,
        isBoolean: {
            errorMessage: 'Food/Accommodation must be true/false'
        }
    },
    'guarantee_time': {
        notEmpty: true,
        isInt: {
            errorMessage: 'Enter a valid guarantee time'
        }
    },
    'display_location': {
        notEmpty: true,
        errorMessage: "Display location cannot be empty"
    },
    'location_name': {
        notEmpty: true,
        errorMessage: "Location cannot be empty"
    },
    'lat': {
        notEmpty: true,
        isLatLong: {
            errorMessage: "Enter a valid latitude"
        }
    },
    'long': {
        notEmpty: true,
        isLatLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'working_hours': {
        notEmpty: true,
        isInt: {
            errorMessage: 'working_hours cannot be empty'
        }
    },
    'interview_dates': {
        isValidInterviewDate: {
            errorMessage: "Make sure all interview dates are valid"
        }
    },
    'trade': {
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
        notEmpty: true,
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