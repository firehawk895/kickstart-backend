var constants = require('../constants')
module.exports = {
    'name': {
        optional : true,
        notEmpty: {
            errorMessage: 'name cannot be empty',
        }
    },
    'location_name': {
        optional: true,
        notEmpty : {
            errorMessage: 'Please enter location for the leader'
        }
    },
    'lat': {//
        optional: true,
        isLat: {
            errorMessage: "Enter a valid latitude"
        }
    },
    'long': {//
        optional: true,
        isLong: {
            errorMessage: "Enter a valid longitude"
        }
    },
    'mobile': {
        optional: true,
        isMobilePhone: {
            options: ['en-IN'],
            errorMessage: 'Enter a valid Indian mobile number'
        },
        isNewUser: {
            errorMessage: 'Leader mobile already registered'
        }
    },
    'isVerified': {
        optional: true,
        isBoolean: {
            errorMessage: 'isVerified status must be true/false'
        }
    }
}