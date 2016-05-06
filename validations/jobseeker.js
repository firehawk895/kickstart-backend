var constants = require('../constants')
module.exports = {
    'name': {
        notEmpty: true,
        errorMessage: 'Name cannot be empty'
    },
    'mobile': {
        notEmpty: true,
        errorMessage: 'Mobile cannot be empty',
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        }
    },
    'educationLevel': {
        notEmpty: true,
        isIn: {
            options: constants.education,
            errorMessage: 'Please enter a valid education level'
        }
    },
    'location_name': {
        notEmpty: true,
        errorMessage: "Location name cannot be empty"
    },
    'lat': {
        notEmpty: true,
        isLatLong: {
            errorMessage: "Enter a valid lat/long"
        }
    },
    'long': {
        notEmpty: true,
        isLatLong: {
            errorMessage: "Enter a valid lat/long"
        }
    },
    'long': {
        notEmpty: true,
        isLatLong: {
            errorMessage: "Enter a valid lat/long"
        }
    },
    'gender': {
        notEmpty: true,
        isIn: {
            options: constants.gender,
            errorMessage: 'Please enter a valid education level'
        }
    },
    'dateOfBirth': {
        notEmpty: true,
        isInt: {
            options: constants.unixTimeStampRange,
            errorMessage: "Please enter a valid dateOfBirth (unixtimestamp) in seconds"
        }
    },
    'lastSalary': {
        optional: true,
        isInt: {
            errorMessage: "Please enter a valid salary"
        }
    },
    'communication': {
        notEmpty: true,
        isIn: {
            options: constants.communication,
            errorMessage: "Enter valid communication data"
        }
    },
    'hasBike': {
        optional: true,
        isBoolean: {
            errorMessage: "hasBike must be true/false"
        }
    },
    'license': {
        optional: true,
        isIn: {
            options: constants.license,
            errorMessage: 'Please enter a valid education level'
        }
    },
    'hasSmartphone': {
        optional: true,
        isBoolean: {
            errorMessage: "hasSmartphone must be true/false"
        }
    },
    'computer': {
        optional: true,
        isIn: {
            options : constants.computer,
            errorMessage: "Enter a valid Computer profieciency"
        }
    },
    'avatar': {
        optional: true,
        isImage: {

        }
    }


    // 'educationLevel': {
    //     notEmpty:  true,
    //     isIn: {
    //         options : Object.keys(constants.education)
    //     },
    //     errorMessage: 'Enter a valid education level'
    // },
    // 'location_name': {
    //     notEmpty: true,
    //     errorMessage: "Enter a location name"
    // }
}