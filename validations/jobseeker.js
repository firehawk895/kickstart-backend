var constants = require('../constants')
module.exports = {
    'name': {
        notEmpty: {
            errorMessage: 'Name cannot be empty'
        }
    },
    'mobile': {//
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        },
        isNewJobseeker: {
            errorMessage: 'Jobseeker mobile already registered'
        }
    },
    'educationLevel': {
        isIn: {
            options: [Object.keys(constants.education)],
            errorMessage: 'Please enter a valid education level'
        }
    },
    'location_name': {
        optional : true,
        errorMessage: "Location name cannot be empty"
    },
    'lat': {
        optional: true,
        isLat: {
            errorMessage: "Enter a valid lattitude"
        }
    },
    'long': {//
        optional: true,
        isLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'gender': {
        isIn: {
            options: constants.gender,
            errorMessage: 'Please enter a valid gender'
        }
    },
    'dateOfBirth': {
        isInt: {
            errorMessage: "Please enter a valid date of birth"
        }
    },
    'lastSalary': {
        optional: true,
        isInt: {
            errorMessage: "Please enter a valid salary"
        }
    },
    'communication': {
        optional: true,
        isIn: {
            options: [Object.keys(constants.communication)],
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
            options: [Object.keys(constants.license)],
            errorMessage: 'Please enter a valid license status'
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
            options : [Object.keys(constants.computer)],
            errorMessage: "Enter a valid Computer profieciency"
        }
    },
    'avatar': {
        optional: true,
        isImage: {
            errorMessage: "File should be a valid image"
        }
    },
}